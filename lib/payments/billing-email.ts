import "server-only";
import { db } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { sendEmailAction } from "@/lib/email/send";
import type { EmailEvent } from "@/lib/email/types";
import { createDodoPayments } from "./dodopayments";
import { paymentCredentials, productIdForPlan } from "./config";

export type BillingEmailInput = {
  id: string;
  userId: string;
  event: EmailEvent;
  subscriptionId: string;
  paymentEnvironment: "TEST" | "LIVE";
  paymentId?: string;
  periodEnd?: Date;
};

export async function queueBillingEmail(
  tx: Prisma.TransactionClient,
  input: BillingEmailInput,
) {
  await tx.billingEmail.upsert({
    where: { id: input.id },
    create: { ...input, event: input.event as Prisma.InputJsonValue },
    update: {},
  });
}

// A short lease prevents overlapping webhook and cron workers from sending together.
export async function deliverBillingEmails(ids?: string[], budgetMs = 45_000) {
  const deadline = Date.now() + budgetMs;
  const now = new Date();
  const jobs = await db.billingEmail.findMany({
    where: {
      completedAt: null,
      nextAttemptAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
      ...(ids ? { id: { in: ids } } : {}),
    },
    orderBy: { nextAttemptAt: "asc" },
    take: 25,
  });
  let handled = 0;
  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    if (Date.now() > deadline - 30_000) break;
    const lease = new Date(Date.now() + 5 * 60_000);
    const claim = await db.billingEmail.updateMany({
      where: {
        id: job.id,
        completedAt: null,
        nextAttemptAt: { lte: now },
        OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
      },
      data: { lockedUntil: lease, attempts: { increment: 1 } },
    });
    if (!claim.count) continue;
    handled++;
    try {
      const user = await db.user.findUnique({ where: { id: job.userId } });
      const event = job.event as unknown as EmailEvent;
      let obsolete = !user;
      if (user && event.action !== "PAYMENT_RECEIPT") {
        const samePeriod =
          user.subscriptionId === job.subscriptionId &&
          user.subscriptionCurrentPeriodEnd?.getTime() ===
            job.periodEnd?.getTime();
        const cancelled =
          user.subscriptionCancelAtPeriodEnd ||
          user.subscriptionStatus === "cancelled";
        const future = Boolean(
          job.periodEnd && job.periodEnd.getTime() > Date.now(),
        );
        obsolete =
          !samePeriod ||
          (event.action === "PLAN_ACCESS_ENDED"
            ? future || user.plan !== "FREE"
            : !future ||
              user.plan === "FREE" ||
              !["active", "cancelled"].includes(
                user.subscriptionStatus ?? "",
              ) ||
              (event.action === "PLAN_RENEWAL_REMINDER"
                ? cancelled
                : !cancelled));
      }
      if (obsolete || !user) {
        await db.billingEmail.updateMany({
          where: { id: job.id, lockedUntil: lease },
          data: {
            completedAt: new Date(),
            lockedUntil: null,
            lastError: "obsolete",
          },
        });
        continue;
      }
      const attachments = [];
      if (event.action === "PAYMENT_RECEIPT") {
        const config = paymentCredentials();
        if (
          (config.environment === "live_mode" ? "LIVE" : "TEST") !==
          job.paymentEnvironment
        )
          throw new Error("environment_mismatch");
        if (!job.paymentId || event.paymentId !== job.paymentId)
          throw new Error("invalid_payment");
        const client = createDodoPayments(config.apiKey, config.environment);
        const options = { timeout: 10_000, maxRetries: 0 };
        const payment = await client.payments.retrieve(job.paymentId, options);
        const subscription = await client.subscriptions.retrieve(
          job.subscriptionId,
          {},
          options,
        );
        const subscriptionIds =
          payment.subscription_ids ??
          (payment.subscription_id ? [payment.subscription_id] : []);
        if (
          payment.status !== "succeeded" ||
          !subscriptionIds.includes(job.subscriptionId) ||
          payment.customer.customer_id !== subscription.customer.customer_id ||
          (user.customerId &&
            user.customerId !== payment.customer.customer_id) ||
          !(
            subscription.metadata?.userId === user.id ||
            user.subscriptionId === job.subscriptionId
          ) ||
          ![productIdForPlan("CREATOR"), productIdForPlan("PROFESSIONAL")]
            .filter(Boolean)
            .includes(subscription.product_id)
        )
          throw new Error("payment_ownership_mismatch");
        const response = await client.invoices.payments.retrieve(
          job.paymentId,
          {},
          options,
        );
        if (!response.ok) throw new Error("invoice_unavailable");
        const bytes = Buffer.from(await response.arrayBuffer());
        if (
          bytes.length > 10 * 1024 * 1024 ||
          bytes.subarray(0, 5).toString() !== "%PDF-"
        )
          throw new Error("invalid_invoice_pdf");
        attachments.push({
          filename: `LessonMap-invoice-${job.paymentId.replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`,
          content: bytes,
          contentType: "application/pdf",
        });
      }
      const result = await sendEmailAction(
        { ...event, to: user.email, name: user.name },
        attachments,
      );
      if (
        result.status === "failed" ||
        (result.status === "skipped" && result.reason === "not_configured")
      )
        throw new Error(
          result.status === "failed" ? result.reason : "not_configured",
        );
      await db.billingEmail.updateMany({
        where: { id: job.id, lockedUntil: lease },
        data: { completedAt: new Date(), lockedUntil: null, lastError: null },
      });
      sent++;
    } catch {
      failed++;
      await db.billingEmail.updateMany({
        where: { id: job.id, lockedUntil: lease },
        data: {
          lockedUntil: null,
          nextAttemptAt: new Date(Date.now() + 15 * 60_000),
          lastError: "delivery_failed",
        },
      });
      console.error("Billing email pending retry", { id: job.id });
    }
  }
  return { sent, failed, handled };
}

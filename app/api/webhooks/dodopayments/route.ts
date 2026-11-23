import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { db } from "@/lib/prisma";
import { paymentCredentials, productIdForPlan } from "@/lib/payments/config";
import { effectiveAiPlan } from "@/lib/ai/schema";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  queueBillingEmail,
  deliverBillingEmails,
} from "@/lib/payments/billing-email";
import { createDodoPayments } from "@/lib/payments/dodopayments";

export const maxDuration = 120;

type PaidPlan = "CREATOR" | "PROFESSIONAL";

type DodoWebhookPayload = {
  type?: string;
  data?: {
    subscription_id?: string;
    subscription_ids?: string[];
    payment_id?: string;
    product_id?: string;
    status?: string;
    next_billing_date?: string;
    cancel_at_next_billing_date?: boolean;
    customer_id?: string;
    customer?: {
      customer_id?: string;
      id?: string;
      email?: string;
    };
    metadata?: Record<string, string | undefined>;
  };
};

function paidPlanForProduct(productId: string | undefined): PaidPlan | null {
  if (!productId) return null;

  const creatorProductId = productIdForPlan("CREATOR");
  const professionalProductId = productIdForPlan("PROFESSIONAL");

  if (creatorProductId && productId === creatorProductId) return "CREATOR";
  if (professionalProductId && productId === professionalProductId) {
    return "PROFESSIONAL";
  }

  return null;
}

function optionalDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("DODO_PAYMENTS_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 500 },
    );
  }

  const webhookId = req.headers.get("webhook-id");
  const webhookSignature = req.headers.get("webhook-signature");
  const webhookTimestamp = req.headers.get("webhook-timestamp");

  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    return NextResponse.json(
      { error: "Missing webhook headers" },
      { status: 400 },
    );
  }

  const rawBody = await req.text();
  if (rawBody.length > 1024 * 1024 || webhookId.length > 200) {
    return NextResponse.json(
      { error: "Webhook request is too large" },
      { status: 413 },
    );
  }

  try {
    const webhook = new Webhook(webhookSecret);
    await webhook.verify(rawBody, {
      "webhook-id": webhookId,
      "webhook-signature": webhookSignature,
      "webhook-timestamp": webhookTimestamp,
    });
  } catch {
    console.warn("Rejected webhook with an invalid signature", { webhookId });
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  let payload: DodoWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as DodoWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const eventType = payload.type;
  const data = payload.data;
  if (!eventType || !data) {
    return NextResponse.json(
      { error: "Invalid webhook payload" },
      { status: 400 },
    );
  }

  try {
    const queuedEmails: string[] = [];
    // This mode must correspond to the configured endpoint signing secret.
    const mode = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim();
    if (mode !== "test_mode" && mode !== "live_mode") {
      throw new Error(
        "DODO_PAYMENTS_ENVIRONMENT must be test_mode or live_mode",
      );
    }
    const paymentEnvironment = mode === "live_mode" ? "LIVE" : "TEST";
    const processed = await db.$transaction(
      async (tx) => {
        const existing = await tx.webhookEvent.findUnique({
          where: { id: webhookId },
          select: { id: true },
        });
        if (existing) return false;

        const subscriptionId =
          data.subscription_id ?? data.subscription_ids?.[0];
        const customerId =
          data.customer?.customer_id ?? data.customer?.id ?? data.customer_id;
        const customerEmail = data.customer?.email;
        const metadataUserId = data.metadata?.userId;
        const plan = paidPlanForProduct(data.product_id);
        let periodEnd = optionalDate(data.next_billing_date);

        const grantEvents = new Set([
          "subscription.active",
          "subscription.renewed",
          "subscription.plan_changed",
        ]);
        const revokeEvents = new Set([
          "subscription.on_hold",
          "subscription.failed",
          "subscription.expired",
        ]);

        const needsUser =
          (eventType === "payment.succeeded" && Boolean(subscriptionId)) ||
          grantEvents.has(eventType) ||
          eventType === "subscription.updated" ||
          eventType === "subscription.cancelled" ||
          revokeEvents.has(eventType);

        // The identifiers on a subscription event are not equally useful. On a
        // first purchase our user row has no subscriptionId/customerId yet, so
        // picking whichever identifier the payload happens to contain first (the
        // old behaviour) always missed the user and made the webhook fail. Try
        // every identifier we have and stop at the first one that matches.
        const candidateFilters: Prisma.UserWhereInput[] = [];
        if (metadataUserId) candidateFilters.push({ id: metadataUserId });
        if (customerEmail) candidateFilters.push({ email: customerEmail });
        if (customerId) candidateFilters.push({ customerId });
        if (subscriptionId) candidateFilters.push({ subscriptionId });

        const userSelect = {
          id: true,
          email: true,
          name: true,
          plan: true,
          subscriptionId: true,
          customerId: true,
          subscriptionStatus: true,
          subscriptionCancelAtPeriodEnd: true,
          subscriptionCurrentPeriodEnd: true,
        } as const;
        const candidateUsers = new Map<
          string,
          {
            id: string;
            email: string;
            name: string;
            plan: "FREE" | "CREATOR" | "PROFESSIONAL";
            subscriptionId: string | null;
            customerId: string | null;
            subscriptionStatus: string | null;
            subscriptionCancelAtPeriodEnd: boolean;
            subscriptionCurrentPeriodEnd: Date | null;
          }
        >();
        for (const where of candidateFilters) {
          const candidate = await tx.user.findFirst({
            where,
            select: userSelect,
          });
          if (candidate) candidateUsers.set(candidate.id, candidate);
        }
        if (candidateUsers.size > 1) {
          throw new Error(`Conflicting user identifiers for ${eventType}`);
        }
        let matchedUser = candidateUsers.values().next().value ?? null;

        // Every subscription event that can change access must resolve to one
        // existing user. Otherwise we would acknowledge the event while
        // leaving a user paid by mistake.
        if (needsUser && !matchedUser) {
          console.error("No user matched this Dodo event", {
            webhookId,
            eventType,
            hasMetadataUserId: Boolean(metadataUserId),
            hasCustomerEmail: Boolean(customerEmail),
            hasCustomerId: Boolean(customerId),
            hasSubscriptionId: Boolean(subscriptionId),
            productId: data.product_id ?? null,
          });
          throw new Error(`No matching user for ${eventType}`);
        }

        const userId = matchedUser?.id ?? null;
        if (userId) {
          await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${userId} FOR UPDATE`;
          matchedUser = await tx.user.findFirst({
            where: { id: userId },
            select: userSelect,
          });
          if (!matchedUser)
            throw new Error(
              "Matched user disappeared during webhook processing",
            );
        }

        const staleSubscription = Boolean(
          matchedUser?.subscriptionId &&
          subscriptionId &&
          matchedUser.subscriptionId !== subscriptionId,
        );
        if (
          staleSubscription &&
          !grantEvents.has(eventType) &&
          eventType !== "payment.succeeded"
        ) {
          await tx.webhookEvent.create({
            data: { id: webhookId, type: eventType },
          });
          return true;
        }
        if (
          matchedUser?.customerId &&
          customerId &&
          matchedUser.customerId !== customerId
        ) {
          throw new Error(
            "Dodo customer does not match the account's linked customer",
          );
        }
        if (
          staleSubscription &&
          grantEvents.has(eventType) &&
          matchedUser &&
          effectiveAiPlan(matchedUser) !== "FREE"
        ) {
          throw new Error(
            "A different active subscription is already linked to this account",
          );
        }

        if (
        data.cancel_at_next_billing_date === true &&
        !periodEnd &&
        !matchedUser?.subscriptionCurrentPeriodEnd &&
        subscriptionId && matchedUser
      ) {
        const config = paymentCredentials();
        const subscription = await createDodoPayments(config.apiKey, config.environment)
          .subscriptions.retrieve(subscriptionId, {}, { timeout: 8000, maxRetries: 0 });
        if (subscription.customer.customer_id !== (matchedUser.customerId ?? customerId))
          throw new Error("Cancellation customer mismatch");
        periodEnd = optionalDate(subscription.next_billing_date);
        if (!periodEnd) throw new Error("Cancellation needs a verified paid period");
      }

      if (grantEvents.has(eventType)) {
          if (!userId || !subscriptionId || !customerId || !plan) {
            throw new Error(`Cannot safely grant access for ${eventType}`);
          }
          if (data.status && data.status !== "active") {
            throw new Error(
              `Cannot grant access from a ${data.status} subscription`,
            );
          }

          await tx.user.update({
            where: { id: userId },
            data: {
              plan,
              paymentEnvironment,
              subscriptionId,
              customerId,
              subscriptionProductId: data.product_id,
              subscriptionStatus: data.status ?? "active",
              subscriptionCurrentPeriodEnd: periodEnd,
              subscriptionCancelAtPeriodEnd:
                data.cancel_at_next_billing_date ?? false,
            },
          });
        } else if (
          eventType === "subscription.cancelled" ||
          (eventType === "subscription.updated" && data.status === "cancelled")
        ) {
          if (!userId || !matchedUser || !subscriptionId)
            throw new Error("Unmatched cancellation");
          // Keep the known paid boundary. A cancellation must never create another cycle.
          let end = matchedUser.subscriptionCurrentPeriodEnd ?? periodEnd;
          let paidPlan = matchedUser.plan !== "FREE" ? matchedUser.plan : plan;
          if (!end || !paidPlan) {
            const config = paymentCredentials();
            const subscription = await createDodoPayments(
              config.apiKey,
              config.environment,
            ).subscriptions.retrieve(
              subscriptionId,
              {},
              { timeout: 8000, maxRetries: 0 },
            );
            if (subscription.customer.customer_id !== matchedUser.customerId)
              throw new Error("Cancellation customer mismatch");
            end ??= optionalDate(subscription.next_billing_date);
            paidPlan ??= paidPlanForProduct(subscription.product_id);
          }
          if (!end || !paidPlan)
            throw new Error("Cancellation needs a verified paid period");
          const remaining = end.getTime() > Date.now();
          await tx.user.update({
            where: { id: userId },
            data: {
              plan: remaining ? paidPlan : "FREE",
              subscriptionStatus: "cancelled",
              subscriptionCurrentPeriodEnd: end,
              subscriptionCancelAtPeriodEnd: true,
            },
          });
          const action = remaining
            ? "CANCELLATION_SCHEDULED"
            : "PLAN_ACCESS_ENDED";
          const id = `${paymentEnvironment}:${subscriptionId}:${action}:${end.toISOString()}`;
          await queueBillingEmail(tx, {
            id,
            userId,
            subscriptionId,
            paymentEnvironment,
            periodEnd: end,
            event: {
              action,
              to: matchedUser.email,
              name: matchedUser.name,
              eventId: id,
              periodEnd: end.toISOString(),
            },
          });
          queuedEmails.push(id);
        } else if (eventType === "subscription.updated") {
          if (!userId) {
            throw new Error("Cannot update a user that was not matched");
          }
          if (
            data.status === "active" &&
            (!plan || !subscriptionId || !customerId)
          ) {
            throw new Error(
              "Cannot safely keep access from an incomplete event",
            );
          }

          const shouldRevoke = !["active", "cancelled"].includes(
            data.status ?? matchedUser?.subscriptionStatus ?? "",
          );

          await tx.user.update({
            where: { id: userId },
            data: {
              ...(data.status === "active" && plan && !shouldRevoke
                ? { plan }
                : {}),
              paymentEnvironment,
              ...(shouldRevoke ? { plan: "FREE" as const } : {}),
              ...(subscriptionId ? { subscriptionId } : {}),
              ...(customerId ? { customerId } : {}),
              ...(data.product_id
                ? { subscriptionProductId: data.product_id }
                : {}),
              ...(data.status ? { subscriptionStatus: data.status } : {}),
              subscriptionCurrentPeriodEnd:
                periodEnd ?? matchedUser?.subscriptionCurrentPeriodEnd,
              subscriptionCancelAtPeriodEnd:
                data.cancel_at_next_billing_date ??
                matchedUser?.subscriptionCancelAtPeriodEnd ??
                false,
            },
          });
        } else if (revokeEvents.has(eventType)) {
          if (!userId) {
            throw new Error("Cannot revoke access for an unmatched user");
          }

          await tx.user.update({
            where: { id: userId },
            data: {
              plan: "FREE",
              subscriptionStatus: data.status ?? eventType.split(".")[1],
              subscriptionCurrentPeriodEnd:
                periodEnd ?? matchedUser?.subscriptionCurrentPeriodEnd,
              subscriptionCancelAtPeriodEnd: false,
            },
          });
        }

        if (
          eventType === "subscription.expired" &&
          matchedUser &&
          subscriptionId
        ) {
          const end = periodEnd ?? matchedUser.subscriptionCurrentPeriodEnd;
          if (end && end.getTime() <= Date.now()) {
            const id = `${paymentEnvironment}:${subscriptionId}:PLAN_ACCESS_ENDED:${end.toISOString()}`;
            await queueBillingEmail(tx, {
              id,
              userId: matchedUser.id,
              subscriptionId,
              paymentEnvironment,
              periodEnd: end,
              event: {
                action: "PLAN_ACCESS_ENDED",
                eventId: id,
                to: matchedUser.email,
                name: matchedUser.name,
                periodEnd: end.toISOString(),
              },
            });
            queuedEmails.push(id);
          }
        }
        await tx.webhookEvent.create({
          data: { id: webhookId, type: eventType },
        });

        if (
          matchedUser &&
          subscriptionId &&
          eventType === "subscription.updated" &&
          data.status !== "cancelled" &&
          data.cancel_at_next_billing_date === true &&
          (periodEnd ?? matchedUser.subscriptionCurrentPeriodEnd)
        ) {
          const end = (periodEnd ?? matchedUser.subscriptionCurrentPeriodEnd)!;
          if (end.getTime() > Date.now()) {
            const id = `${paymentEnvironment}:${subscriptionId}:CANCELLATION_SCHEDULED:${end.toISOString()}`;
            await queueBillingEmail(tx, {
              id,
              userId: matchedUser.id,
              subscriptionId,
              paymentEnvironment,
              periodEnd: end,
              event: {
                action: "CANCELLATION_SCHEDULED",
                to: matchedUser.email,
                name: matchedUser.name,
                eventId: id,
                periodEnd: end.toISOString(),
              },
            });
            queuedEmails.push(id);
          }
        }
        if (
          matchedUser &&
          subscriptionId &&
          eventType === "payment.succeeded"
        ) {
          if (!data.payment_id || data.status !== "succeeded")
            throw new Error("Successful payment details are required");
          const id = `${paymentEnvironment}:payment:${data.payment_id}`;
          await queueBillingEmail(tx, {
            id,
            userId: matchedUser.id,
            subscriptionId,
            paymentEnvironment,
            paymentId: data.payment_id,
            event: {
              action: "PAYMENT_RECEIPT",
              to: matchedUser.email,
              name: matchedUser.name,
              eventId: id,
              paymentId: data.payment_id,
            },
          });
          queuedEmails.push(id);
        }
        return true;
      },
      { timeout: 20_000 },
    );

    // Delivery failure leaves the durable job available for the billing cron.
    if (processed && queuedEmails.length) {
      try {
        await deliverBillingEmails(queuedEmails);
      } catch {
        console.error("Billing email delivery deferred");
      }
    }
    console.info("Dodo webhook handled", { webhookId, eventType, processed });
    return NextResponse.json({ received: true, eventType, processed });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ received: true, eventType, processed: false });
    }

    console.error("Dodo webhook processing failed", {
      webhookId,
      eventType,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

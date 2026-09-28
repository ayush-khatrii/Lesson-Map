import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { db } from "@/lib/prisma";
import { productIdForPlan } from "@/lib/payments/config";
import type { Prisma } from "@/app/generated/prisma/client";

type PaidPlan = "CREATOR" | "PROFESSIONAL";

type DodoWebhookPayload = {
  type?: string;
  data?: {
    subscription_id?: string;
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
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventType = payload.type;
  const data = payload.data;
  if (!eventType || !data) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  try {
    const processed = await db.$transaction(async (tx) => {
      const existing = await tx.webhookEvent.findUnique({
        where: { id: webhookId },
        select: { id: true },
      });
      if (existing) return false;

      const subscriptionId = data.subscription_id;
      const customerId =
        data.customer?.customer_id ?? data.customer?.id ?? data.customer_id;
      const customerEmail = data.customer?.email;
      const metadataUserId = data.metadata?.userId;
      const plan = paidPlanForProduct(data.product_id);
      const periodEnd = optionalDate(data.next_billing_date);

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

      let matchedUser: { id: string } | null = null;
      for (const where of candidateFilters) {
        matchedUser = await tx.user.findFirst({
          where,
          select: { id: true },
        });
        if (matchedUser) break;
      }

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

      if (grantEvents.has(eventType)) {
        if (!userId || !subscriptionId || !customerId || !plan) {
          throw new Error(`Cannot safely grant access for ${eventType}`);
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            plan,
            subscriptionId,
            customerId,
            subscriptionProductId: data.product_id,
            subscriptionStatus: data.status ?? "active",
            subscriptionCurrentPeriodEnd: periodEnd,
            subscriptionCancelAtPeriodEnd:
              data.cancel_at_next_billing_date ?? false,
          },
        });
      } else if (eventType === "subscription.updated") {
        if (!userId) {
          throw new Error("Cannot update a user that was not matched");
        }
        if (
          data.status === "active" &&
          (!plan || !subscriptionId || !customerId)
        ) {
          throw new Error("Cannot safely keep access from an incomplete event");
        }

        const accessContinues =
          data.status === "cancelled" &&
          data.cancel_at_next_billing_date === true &&
          periodEnd !== null &&
          periodEnd.getTime() > Date.now();
        const shouldRevoke =
          data.status !== "active" && !accessContinues;

        await tx.user.update({
          where: { id: userId },
          data: {
            ...(data.status === "active" && plan ? { plan } : {}),
            ...(shouldRevoke ? { plan: "FREE" as const } : {}),
            ...(subscriptionId ? { subscriptionId } : {}),
            ...(customerId ? { customerId } : {}),
            ...(data.product_id
              ? { subscriptionProductId: data.product_id }
              : {}),
            ...(data.status ? { subscriptionStatus: data.status } : {}),
            subscriptionCurrentPeriodEnd: periodEnd,
            subscriptionCancelAtPeriodEnd:
              data.status === "cancelled"
                ? accessContinues
                : (data.cancel_at_next_billing_date ?? false),
          },
        });
      } else if (eventType === "subscription.cancelled") {
        if (!userId) {
          throw new Error("Cannot cancel a subscription for an unmatched user");
        }

        const accessContinues =
          data.cancel_at_next_billing_date === true &&
          periodEnd !== null &&
          periodEnd.getTime() > Date.now();

        await tx.user.update({
          where: { id: userId },
          data: {
            ...(accessContinues ? {} : { plan: "FREE" }),
            subscriptionStatus: "cancelled",
            subscriptionCurrentPeriodEnd: periodEnd,
            subscriptionCancelAtPeriodEnd: accessContinues,
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
            subscriptionCurrentPeriodEnd: periodEnd,
            subscriptionCancelAtPeriodEnd: false,
          },
        });
      }

      await tx.webhookEvent.create({
        data: { id: webhookId, type: eventType },
      });

      return true;
    });

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

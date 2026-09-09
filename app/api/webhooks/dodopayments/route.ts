import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { db } from "@/lib/prisma";

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

  const creatorProductId = process.env.DODO_PRODUCT_CREATOR;
  const professionalProductId = process.env.DODO_PRODUCT_PROFESSIONAL;

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
  const webhookSecret = process.env.DODOPAYMENTS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("DODOPAYMENTS_WEBHOOK_SECRET is not configured");
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

      const userWhere = metadataUserId
        ? { id: metadataUserId }
        : subscriptionId
          ? { subscriptionId }
          : customerId
            ? { customerId }
            : customerEmail
              ? { email: customerEmail }
              : null;

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

      // Every subscription event that can change access must resolve to one
      // existing user. Otherwise we would acknowledge the event while
      // leaving a user paid by mistake.
      if (needsUser && !userWhere) {
        throw new Error(`Cannot find a user for ${eventType}`);
      }

      const matchedUser = userWhere
        ? await tx.user.findFirst({
            where: userWhere,
            select: { id: true },
          })
        : null;

      if (needsUser && !matchedUser) {
        throw new Error(`No matching user for ${eventType}`);
      }

      if (grantEvents.has(eventType)) {
        if (!userWhere || !subscriptionId || !customerId || !plan) {
          throw new Error(`Cannot safely grant access for ${eventType}`);
        }

        await tx.user.update({
          where: { id: matchedUser!.id },
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
          where: { id: matchedUser!.id },
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
        const accessContinues =
          data.cancel_at_next_billing_date === true &&
          periodEnd !== null &&
          periodEnd.getTime() > Date.now();

        await tx.user.update({
          where: { id: matchedUser!.id },
          data: {
            ...(accessContinues ? {} : { plan: "FREE" }),
            subscriptionStatus: "cancelled",
            subscriptionCurrentPeriodEnd: periodEnd,
            subscriptionCancelAtPeriodEnd: accessContinues,
          },
        });
      } else if (revokeEvents.has(eventType)) {
        await tx.user.update({
          where: { id: matchedUser!.id },
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

import { db } from "@/lib/prisma";
import {
  creatorProductId,
  dodoPayments,
} from "@/lib/payments/dodopayments";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";

type WebhookData = {
  customer?: {
    customer_id?: string;
  };
  is_partial?: boolean;
  metadata?: Record<string, string>;
  payment_id?: string;
  product_id?: string;
  status?: string;
  subscription_id?: string;
};

type WebhookPayload = {
  data: WebhookData;
  type: string;
};

async function activateSubscription(data: WebhookData, status: string) {
  if (
    !data.subscription_id ||
    !data.product_id ||
    data.product_id !== creatorProductId
  ) {
    return;
  }

  const subscriptionData = {
    plan: "CREATOR" as const,
    subscriptionId: data.subscription_id,
    subscriptionStatus: status,
    customerId: data.customer?.customer_id,
  };

  const existingSubscription = await db.user.updateMany({
    where: { subscriptionId: data.subscription_id },
    data: subscriptionData,
  });

  if (existingSubscription.count > 0) return;

  const userId = data.metadata?.user_id;
  if (!userId) return;

  await db.user.updateMany({
    where: { id: userId },
    data: subscriptionData,
  });
}

async function deactivateSubscription(
  subscriptionId: string | null | undefined,
  status: string,
) {
  if (!subscriptionId) return;

  await db.user.updateMany({
    where: { subscriptionId },
    data: {
      plan: "FREE",
      subscriptionStatus: status,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SIGNING_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret is not configured" },
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

    const body = await req.text();
    const webhook = new Webhook(webhookSecret);

    try {
      await webhook.verify(body, {
        "webhook-id": webhookId,
        "webhook-signature": webhookSignature,
        "webhook-timestamp": webhookTimestamp,
      });
    } catch (error) {
      console.error("Webhook verification failed:", error);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 },
      );
    }

    const payload = JSON.parse(body) as WebhookPayload;
    const { data } = payload;

    switch (payload.type) {
      case "subscription.active":
      case "subscription.renewed":
      case "subscription.updated":
      case "subscription.plan_changed":
        if (data.status === "active" && data.product_id === creatorProductId) {
          await activateSubscription(data, data.status);
        } else {
          await deactivateSubscription(
            data.subscription_id,
            data.status ?? "inactive",
          );
        }
        break;

      case "subscription.on_hold":
      case "subscription.cancelled":
      case "subscription.failed":
      case "subscription.expired":
        await deactivateSubscription(
          data.subscription_id,
          data.status ?? payload.type.replace("subscription.", ""),
        );
        break;

      case "payment.failed":
      case "payment.cancelled":
        if (data.subscription_id) {
          await db.user.updateMany({
            where: { subscriptionId: data.subscription_id },
            data: {
              subscriptionStatus: payload.type.replace("payment.", "payment_"),
            },
          });
        }
        break;

      case "refund.succeeded":
        if (!data.is_partial && data.payment_id) {
          const payment = await dodoPayments.payments.retrieve(data.payment_id);
          await deactivateSubscription(payment.subscription_id, "refunded");
        }
        break;

      default:
        break;
    }

    return NextResponse.json(
      { received: true, type: payload.type },
      { status: 200 },
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

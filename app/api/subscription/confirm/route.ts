import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { checkoutConfiguration, PaymentConfigurationError } from "@/lib/payments/config";
import { createDodoPayments } from "@/lib/payments/dodopayments";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/payments/request-security";

// Recover a completed checkout when webhook delivery is delayed (including localhost).
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.subscriptionId !== "string" ||
      !/^sub_[a-zA-Z0-9]+$/.test(body.subscriptionId) || body.subscriptionId.length > 100 ||
      !["CREATOR", "PROFESSIONAL"].includes(body.plan)) {
    return NextResponse.json({ error: "Invalid checkout reference." }, { status: 400 });
  }

  try {
    const config = checkoutConfiguration(body.plan);
    const client = createDodoPayments(config.apiKey, config.environment);
    const subscription = await client.subscriptions.retrieve(body.subscriptionId, {
      timeout: 10000, maxRetries: 0,
    });
    // The provider's server-side metadata binds the purchase to the signed-in user.
    // A matching email or an active status in the browser URL is not proof of ownership.
    if (subscription.metadata?.userId !== userId || subscription.product_id !== config.productId) {
      return NextResponse.json({ error: "This checkout does not match your account and plan." }, { status: 403 });
    }
    if (subscription.status !== "active") {
      return NextResponse.json({ subscriptionStatus: subscription.status }, { headers: { "Cache-Control": "no-store" } });
    }

    const periodEnd = new Date(subscription.next_billing_date);
    if (!subscription.customer.customer_id || Number.isNaN(periodEnd.getTime())) {
      throw new Error("Incomplete subscription response");
    }
    // Do not overwrite a different subscription already attached to this account.
    const updated = await db.user.updateMany({
      where: {
        id: userId,
        OR: [
          { subscriptionId: body.subscriptionId },
          { subscriptionId: null, plan: "FREE" },
        ],
      },
      data: {
        plan: body.plan,
        subscriptionId: body.subscriptionId,
        customerId: subscription.customer.customer_id,
        subscriptionProductId: subscription.product_id,
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: periodEnd,
        subscriptionCancelAtPeriodEnd: subscription.cancel_at_next_billing_date,
      },
    });
    if (!updated.count) {
      return NextResponse.json({ error: "Your account already has a different subscription. Please contact support." }, { status: 409 });
    }
    return NextResponse.json({ plan: body.plan, subscriptionId: body.subscriptionId, subscriptionStatus: "active" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof PaymentConfigurationError ? 503 : 502;
    return NextResponse.json({ error: "We could not verify your subscription with the payment provider. Please try again." }, { status });
  }
}

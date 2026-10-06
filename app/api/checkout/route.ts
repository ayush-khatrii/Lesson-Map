import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { createDodoPayments } from "@/lib/payments/dodopayments";
import { checkoutConfiguration, PaymentConfigurationError, type PaidPlan } from "@/lib/payments/config";
import { isSameOriginRequest } from "@/lib/payments/request-security";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function isPaidPlan(plan: unknown): plan is PaidPlan {
  return plan === "CREATOR" || plan === "PROFESSIONAL";
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const username = session.user.name;
    const email = session.user.email;
    if (!username || !email) {
      return NextResponse.json(
        { error: "User information is missing." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null) as { plan?: unknown } | null;
    if (!body || !isPaidPlan(body.plan)) {
      return NextResponse.json({ error: "Invalid checkout plan." }, { status: 400 });
    }

    const plan = body.plan;
    const config = checkoutConfiguration(plan);

    const existingSubscription = await db.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        subscriptionStatus: true,
        subscriptionCancelAtPeriodEnd: true,
        subscriptionCurrentPeriodEnd: true,
        customerId: true,
      },
    });
    if (!existingSubscription) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (effectiveAiPlan(existingSubscription) !== "FREE") {
      return NextResponse.json(
        { error: "You already have an active paid subscription." },
        { status: 409 },
      );
    }

    const dodoPayments = createDodoPayments(config.apiKey, config.environment);
    const checkout = await dodoPayments.checkoutSessions.create({
      product_cart: [{ product_id: config.productId, quantity: 1 }],
      customer: existingSubscription.customerId
        ? { customer_id: existingSubscription.customerId }
        : { name: username, email },
      metadata: { plan, userId },
      return_url: config.returnUrl,
    }, { timeout: 10000, maxRetries: 0 });

    if (!checkout.checkout_url) {
      throw new Error("Dodo did not return a hosted checkout URL.");
    }

    return NextResponse.json({
      message: "Checkout URL created successfully.",
      checkoutUrl: checkout.checkout_url,
    });
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      console.error("Checkout configuration error:", error.message);
      return NextResponse.json(
        {
          error: "Checkout is temporarily unavailable. Please try again later.",
          code: "CHECKOUT_NOT_CONFIGURED",
          ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}),
        },
        { status: 503 },
      );
    }
    console.error("Checkout session creation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}

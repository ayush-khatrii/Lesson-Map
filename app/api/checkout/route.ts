import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { createDodoPayments } from "@/lib/payments/dodopayments";
import { checkoutConfiguration, PaymentConfigurationError, type PaidPlan } from "@/lib/payments/config";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const VALID_CHECKOUT_PLANS = ["CREATOR", "PROFESSIONAL"];

export async function POST(req: NextRequest) {
  try {
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

    const body = (await req.json()) as { plan?: unknown };
    if (typeof body.plan !== "string" || !VALID_CHECKOUT_PLANS.includes(body.plan)) {
      return NextResponse.json({ error: "Invalid checkout plan." }, { status: 400 });
    }

    const plan = body.plan as PaidPlan;
    const config = checkoutConfiguration(plan);

    const existingSubscription = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true, subscriptionStatus: true },
    });
    if (
      existingSubscription?.plan !== "FREE" &&
      existingSubscription?.subscriptionStatus === "active"
    ) {
      return NextResponse.json(
        { error: "You already have an active paid subscription." },
        { status: 409 },
      );
    }

    const dodoPayments = createDodoPayments(config.apiKey, config.environment);
    const checkout = await dodoPayments.checkoutSessions.create({
      product_cart: [{ product_id: config.productId, quantity: 1 }],
      customer: { name: username, email },
      metadata: { plan, userId },
      return_url: config.returnUrl,
    });

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
        { error: "Checkout is temporarily unavailable. Please contact support.", code: "CHECKOUT_NOT_CONFIGURED" },
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

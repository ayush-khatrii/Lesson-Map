import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { dodoPayments } from "@/lib/payments/dodopayments";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const PLAN_PRODUCT_MAP: Record<string, string | undefined> = {
  CREATOR: process.env.DODO_PRODUCT_CREATOR,
  PROFESSIONAL: process.env.DODO_PRODUCT_PROFESSIONAL,
};

const VALID_CHECKOUT_PLANS = ["CREATOR", "PROFESSIONAL"];

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      process.env.DODO_PAYMENTS_API_KEY || process.env.DODOPAYMENTS_KEY;
    if (!apiKey) {
      console.error("Dodo Payments API key is not configured");
      return NextResponse.json(
        { error: "Checkout is not configured." },
        { status: 500 },
      );
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

    const body = (await req.json()) as { plan?: unknown };
    if (typeof body.plan !== "string" || !VALID_CHECKOUT_PLANS.includes(body.plan)) {
      return NextResponse.json({ error: "Invalid checkout plan." }, { status: 400 });
    }

    const plan = body.plan;

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

    const productId = PLAN_PRODUCT_MAP[plan];
    if (!productId) {
      console.error(`Missing Dodo product ID for ${plan}`);
      return NextResponse.json(
        { error: "This plan is temporarily unavailable." },
        { status: 503 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (!baseUrl && process.env.NODE_ENV === "production") {
      console.error("NEXT_PUBLIC_BASE_URL is not configured");
      return NextResponse.json(
        { error: "Checkout is not configured." },
        { status: 500 },
      );
    }

    const checkout = await dodoPayments.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { name: username, email },
      metadata: { plan, userId },
      return_url: `${baseUrl ?? "http://localhost:3000"}/dashboard`,
    });

    return NextResponse.json({
      message: "Checkout URL created successfully.",
      checkoutUrl: checkout.checkout_url,
    });
  } catch (error) {
    console.error("Checkout session creation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}

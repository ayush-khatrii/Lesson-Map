import { auth } from "@/lib/auth";
import { dodoPayments } from "@/lib/payments/dodopayments";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// ─── Map plan names to Dodo Payments product IDs ──────────────────────────
// Add your product IDs in .env as:
//   DODO_PRODUCT_CREATOR=your_product_id
//   DODO_PRODUCT_PROFESSIONAL=your_product_id
const PLAN_PRODUCT_MAP: Record<string, string> = {
  CREATOR: process.env.DODO_PRODUCT_CREATOR || "pdt_placeholder_creator",
  PROFESSIONAL: process.env.DODO_PRODUCT_PROFESSIONAL || "pdt_placeholder_professional",
};

// Which plans are valid for checkout (users can pay for these)
const VALID_CHECKOUT_PLANS = ["CREATOR", "PROFESSIONAL"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const username = session.user.name || "UNKNOWN_USER";
    const email = session.user.email || "N/A";

    if (!username || !email) {
      return NextResponse.json(
        { error: "User information is missing." },
        { status: 400 },
      );
    }
    const body = await req.json();
    if (!body || !body.plan) {
      return NextResponse.json(
        { error: "Invalid request body. 'plan' is required." },
        { status: 400 },
      );
    }

    // Make sure the plan is one we support for checkout
    const plan = body.plan as string;
    if (!VALID_CHECKOUT_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan: ${plan}. Must be one of: ${VALID_CHECKOUT_PLANS.join(", ")}` },
        { status: 400 },
      );
    }

    // Get the matching Dodo Payments product ID
    const productId = PLAN_PRODUCT_MAP[plan];

    // Create a checkout session for the selected plan
    const checkout = await dodoPayments.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
        },
      ],
      customer: {
        name: username,
        email: email,
      },
      // Pass the plan name as metadata so the webhook knows what to grant
      metadata: {
        plan: plan,
        userId: session.user.id,
      },
      return_url: process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`
        : "http://localhost:3000/dashboard",
    });

    return NextResponse.json({
      message: "Checkout URL created successfully.",
      checkoutUrl: checkout.checkout_url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}

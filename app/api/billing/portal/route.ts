import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { createDodoPayments } from "@/lib/payments/dodopayments";
import {
  billingPortalConfiguration,
  PaymentConfigurationError,
} from "@/lib/payments/config";
import { isSameOriginRequest } from "@/lib/payments/request-security";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { customerId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (!user.customerId) {
      return NextResponse.json({ error: "No billing account is linked." }, { status: 409 });
    }

    const config = billingPortalConfiguration();
    const dodoPayments = createDodoPayments(config.apiKey, config.environment);
    const portal = await dodoPayments.customers.customerPortal.create(
      user.customerId,
      { return_url: config.returnUrl },
      { timeout: 10000, maxRetries: 0 },
    );
    const portalUrl = new URL(portal.link);
    if (
      portalUrl.protocol !== "https:" ||
      (portalUrl.hostname !== "dodopayments.com" &&
        !portalUrl.hostname.endsWith(".dodopayments.com"))
    ) {
      throw new Error("Dodo returned an invalid billing portal URL.");
    }

    return NextResponse.json(
      { url: portalUrl.href },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      console.error("Billing portal configuration error:", error.message);
      return NextResponse.json(
        { error: "Billing management is temporarily unavailable." },
        { status: 503 },
      );
    }
    console.error("Billing portal session creation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Could not open billing management. Please try again." },
      { status: 502 },
    );
  }
}

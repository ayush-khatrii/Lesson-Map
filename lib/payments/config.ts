export type PaidPlan = "CREATOR" | "PROFESSIONAL";

export class PaymentConfigurationError extends Error {}

export function productIdForPlan(plan: PaidPlan) {
  return process.env[`DODO_PRODUCT_${plan}`]?.trim();
}

export function checkoutConfiguration(plan: PaidPlan): {
  apiKey: string;
  environment: "test_mode" | "live_mode";
  productId: string;
  returnUrl: string;
} {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!apiKey) {
    throw new PaymentConfigurationError("Missing DODO_PAYMENTS_API_KEY.");
  }

  if (!process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim()) {
    throw new PaymentConfigurationError("Missing DODO_PAYMENTS_WEBHOOK_SECRET.");
  }

  const environment = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim();
  if (environment !== "test_mode" && environment !== "live_mode") {
    throw new PaymentConfigurationError(
      "Set DODO_PAYMENTS_ENVIRONMENT to test_mode or live_mode.",
    );
  }

  const productId = productIdForPlan(plan);
  if (!productId) {
    throw new PaymentConfigurationError(`Missing DODO_PRODUCT_${plan}.`);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  let origin: string;
  try {
    const url = new URL(baseUrl);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("Invalid origin");
    }
    origin = url.origin;
  } catch {
    throw new PaymentConfigurationError("Set NEXT_PUBLIC_BASE_URL to your application's http(s) origin.");
  }

  return { apiKey, environment, productId, returnUrl: `${origin}/checkout/return?plan=${plan}` };
}

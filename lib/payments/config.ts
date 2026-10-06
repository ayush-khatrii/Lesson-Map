export type PaidPlan = "CREATOR" | "PROFESSIONAL";
export type PaymentEnvironment = "test_mode" | "live_mode";

export class PaymentConfigurationError extends Error {}

export function productIdForPlan(plan: PaidPlan) {
  return process.env[`DODO_PRODUCT_${plan}`]?.trim();
}

function paymentCredentials(): { apiKey: string; environment: PaymentEnvironment } {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!apiKey) {
    throw new PaymentConfigurationError("Missing DODO_PAYMENTS_API_KEY.");
  }

  const environment = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim();
  if (environment === "test_mode") return { apiKey, environment: "test_mode" };
  if (environment === "live_mode") return { apiKey, environment: "live_mode" };
  throw new PaymentConfigurationError(
    "Set DODO_PAYMENTS_ENVIRONMENT to test_mode or live_mode.",
  );

}

export function applicationOrigin() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  try {
    const url = new URL(baseUrl);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("Invalid origin");
    }
    return url.origin;
  } catch {
    throw new PaymentConfigurationError("Set NEXT_PUBLIC_BASE_URL to your application's http(s) origin.");
  }
}

export function billingPortalConfiguration() {
  return {
    ...paymentCredentials(),
    returnUrl: `${applicationOrigin()}/settings`,
  };
}

export function checkoutConfiguration(plan: PaidPlan): {
  apiKey: string;
  environment: PaymentEnvironment;
  productId: string;
  returnUrl: string;
} {
  const { apiKey, environment } = paymentCredentials();

  if (!process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim()) {
    throw new PaymentConfigurationError("Missing DODO_PAYMENTS_WEBHOOK_SECRET.");
  }

  const productId = productIdForPlan(plan);
  if (!productId) {
    throw new PaymentConfigurationError(`Missing DODO_PRODUCT_${plan}.`);
  }

  return {
    apiKey,
    environment,
    productId,
    returnUrl: `${applicationOrigin()}/checkout/return?plan=${plan}`,
  };
}

import { DodoPayments } from "dodopayments";

const key = process.env.DODO_PAYMENTS_KEY;
if (!key) {
  throw new Error("DODO_PAYMENTS_KEY environment variable is not set.");
}

export const creatorProductId =
  process.env.DODO_CREATOR_PRODUCT_ID ?? "pdt_0NepeRJFaOCuAzpBbqEJY";

const environment =
  process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "live_mode"
    : "test_mode";

export const dodoPayments = new DodoPayments({
  bearerToken: key,
  environment,
});

import { DodoPayments } from "dodopayments";

const key =
  process.env.DODO_PAYMENTS_API_KEY || process.env.DODOPAYMENTS_KEY || "";
const environment =
  process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "live_mode"
    : "test_mode";

export const dodoPayments = new DodoPayments({
  bearerToken: key,
  environment,
});

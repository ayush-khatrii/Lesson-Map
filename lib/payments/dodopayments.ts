import { DodoPayments } from "dodopayments";

export function createDodoPayments(apiKey: string, environment: "test_mode" | "live_mode") {
  return new DodoPayments({ bearerToken: apiKey, environment });
}

import { loadEnvConfig } from "@next/env";
import { checkoutConfiguration } from "../lib/payments/config";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

// Validate locally without printing credentials or contacting the payment provider.
const plans = process.argv.includes("--all")
  ? ["CREATOR", "PROFESSIONAL"] as const
  : ["CREATOR"] as const;
for (const plan of plans) {
  try {
    const config = checkoutConfiguration(plan);
    console.log(`${plan}: configuration ready (${config.environment}). Provider credentials have not been verified.`);
  } catch (error) {
    console.error(`${plan}: ${error instanceof Error ? error.message : "Invalid configuration"}`);
    process.exitCode = 1;
  }
}

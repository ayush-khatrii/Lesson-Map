CREATE TYPE "PaymentEnvironment" AS ENUM ('TEST', 'LIVE');

-- Historical records remain unclassified until their provider mode is verified.
-- Do not change plans, provider IDs, or customer dates during classification.
ALTER TABLE "user" ADD COLUMN "paymentEnvironment" "PaymentEnvironment";

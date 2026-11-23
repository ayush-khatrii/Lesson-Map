CREATE TABLE "BillingEmail" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "event" JSONB NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "paymentEnvironment" "PaymentEnvironment" NOT NULL,
  "paymentId" TEXT,
  "periodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT
);
CREATE INDEX "BillingEmail_completedAt_nextAttemptAt_idx" ON "BillingEmail"("completedAt", "nextAttemptAt");

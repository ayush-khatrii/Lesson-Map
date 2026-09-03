ALTER TABLE "user"
ADD COLUMN "subscriptionProductId" TEXT,
ADD COLUMN "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "subscriptionCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookEvent_type_idx" ON "WebhookEvent"("type");

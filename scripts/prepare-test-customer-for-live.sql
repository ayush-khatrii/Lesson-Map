-- Run only after verifying these IDs in Dodo TEST mode and applying the
-- add_payment_environment Prisma migration. This script does not contact Dodo.
-- Disable the test webhook targeting this database before running this script.
-- Configure live checkout and its live webhook before the customer checks out.
-- This removes paid access until a new live subscription is verified.
-- Original billing values are preserved in AdminAuditLog for reference.
-- Account/course dates are unchanged. The old renewal date is archived, not
-- transferred to Dodo: the new live subscription determines future billing.

BEGIN;

DO $$
DECLARE
  previous_user public."user"%ROWTYPE;
BEGIN
  -- All three IDs must match the SAME user. Never reset users by plan alone.
  SELECT * INTO STRICT previous_user
  FROM public."user"
  WHERE "customerId" = 'cus_0FwaILEUQC1aXEMatKy7v'
    AND "subscriptionId" = 'sub_0NqaILF4hYBplzxe3E9BS'
    AND "subscriptionProductId" = 'pdt_0NkeD0KkSNlke4Sk95wi4'
  FOR UPDATE;

  IF previous_user."paymentEnvironment" = 'LIVE' THEN
    RAISE EXCEPTION 'Refusing to reset a billing record classified as LIVE';
  END IF;

  INSERT INTO public."AdminAuditLog" (
    "id", "action", "targetId", "details", "createdAt"
  ) VALUES (
    'test-billing-reset-' || previous_user."id" || '-' || gen_random_uuid()::text,
    'TEST_BILLING_RESET_FOR_LIVE_CHECKOUT',
    previous_user."id",
    jsonb_build_object(
      'source', 'manual SQL; operator must verify Dodo test mode',
      'previousBilling', jsonb_build_object(
        'plan', previous_user."plan",
        'paymentEnvironment', previous_user."paymentEnvironment",
        'customerId', previous_user."customerId",
        'subscriptionId', previous_user."subscriptionId",
        'subscriptionProductId', previous_user."subscriptionProductId",
        'subscriptionStatus', previous_user."subscriptionStatus",
        'subscriptionCurrentPeriodEnd', previous_user."subscriptionCurrentPeriodEnd",
        'subscriptionCancelAtPeriodEnd', previous_user."subscriptionCancelAtPeriodEnd"
      )
    ),
    now()
  );

  UPDATE public."user"
  SET "plan" = 'FREE',
      "paymentEnvironment" = NULL,
      "customerId" = NULL,
      "subscriptionId" = NULL,
      "subscriptionProductId" = NULL,
      "subscriptionStatus" = NULL,
      "subscriptionCurrentPeriodEnd" = NULL,
      "subscriptionCancelAtPeriodEnd" = false
  WHERE "id" = previous_user."id";

  RAISE NOTICE 'User % is ready for a fresh live checkout; old billing values are in AdminAuditLog', previous_user."id";
END $$;

COMMIT;

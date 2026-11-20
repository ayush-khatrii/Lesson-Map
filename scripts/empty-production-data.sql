-- DESTRUCTIVE: removes ALL rows from the application's tables.
-- Run in Neon SQL Editor with the production branch explicitly selected.
-- First verify STAGING-LESSONMAP contains the users/courses you need to retain.
-- Pause app writes, scheduled jobs, and test webhook deliveries before running.
-- Keeps table definitions, enums, indexes, and _prisma_migrations intact.
-- Deletes customer accounts, courses, admin access, examples, and audit history.
-- Does not delete external R2 objects or cancel subscriptions in Dodo.
-- This script cannot identify the Neon branch from its database name alone.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- List all app tables together so their mutual foreign keys are satisfied.
-- RESTRICT intentionally fails if another, unlisted table references them.
TRUNCATE TABLE
  public."user",
  public."WebhookEvent",
  public."example",
  public."Course",
  public."AiGeneration",
  public."Module",
  public."Lesson",
  public."Resource",
  public."session",
  public."account",
  public."verification",
  public."rateLimit",
  public."AdminAccess",
  public."AdminSession",
  public."AdminVerification",
  public."AdminRateLimit",
  public."AdminRecoveryCode",
  public."AdminAuditLog",
  public."AdminReportCache",
  public."PlaylistImport",
  public."CourseEvent",
  public."Lead",
  public."LessonProgress",
  public."UploadAllocation"
RESTART IDENTITY RESTRICT;

COMMIT;

SELECT
  (SELECT count(*) FROM public."user") AS users_remaining,
  (SELECT count(*) FROM public."Course") AS courses_remaining,
  (SELECT count(*) FROM public."Resource") AS resources_remaining,
  (SELECT count(*) FROM public."_prisma_migrations") AS migration_records_preserved;

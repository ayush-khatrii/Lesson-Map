-- Run against the inspected database before resolving upload_storage_quota.
-- No customer, subscription, course, or resource records are changed.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."UploadAllocation"'::regclass
      AND conname = 'UploadAllocation_size_check'
  ) THEN
    ALTER TABLE public."UploadAllocation"
      ADD CONSTRAINT "UploadAllocation_size_check" CHECK ("size" > 0);
  END IF;
END $$;

-- Reproduce the migration's backfill, preserving allocations already present.
CREATE TEMP TABLE expected_upload_allocations ON COMMIT DROP AS
SELECT DISTINCT ON (r."key") r."key", c."userId", r."lessonId",
  CASE WHEN r."size" > 0 THEN r."size" ELSE 26214400 END AS "size",
  r."createdAt"
FROM public."Resource" r
JOIN public."Lesson" l ON l."id" = r."lessonId"
JOIN public."Module" m ON m."id" = l."moduleId"
JOIN public."Course" c ON c."id" = m."courseId"
WHERE r."key" LIKE 'lesson-resources/%'
ORDER BY r."key", (CASE WHEN r."size" > 0 THEN r."size" ELSE 26214400 END) DESC;

INSERT INTO public."UploadAllocation"
  ("key", "userId", "lessonId", "size", "createdAt", "savedAt")
SELECT "key", "userId", "lessonId", "size", "createdAt", CURRENT_TIMESTAMP
FROM expected_upload_allocations
ON CONFLICT ("key") DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM expected_upload_allocations e
    LEFT JOIN public."UploadAllocation" a ON a."key" = e."key"
    WHERE a."key" IS NULL OR a."userId" <> e."userId"
      OR a."lessonId" <> e."lessonId" OR a."size" < e."size"
      OR a."savedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'Existing upload allocations conflict with the backfill. Transaction aborted; inspect allocations before resolving the migration.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user'
      AND column_name = 'paymentEnvironment'
      AND udt_schema = 'public' AND udt_name = 'PaymentEnvironment'
  ) THEN
    RAISE EXCEPTION 'paymentEnvironment does not use the expected enum; do not resolve its migration.';
  END IF;
END $$;

COMMIT;

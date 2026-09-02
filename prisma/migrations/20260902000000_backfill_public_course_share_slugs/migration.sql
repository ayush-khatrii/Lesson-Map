-- Repair courses published by the legacy visibility toggle, which set
-- isPublic without creating a shareSlug. Add a short ID suffix so duplicate
-- course titles still produce unique, readable URLs.
UPDATE "Course"
SET "shareSlug" = CONCAT(
  COALESCE(
    NULLIF(
      TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("courseName"), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'course'
  ),
  '-',
  RIGHT("id", 8)
)
WHERE "isPublic" = true
  AND "shareSlug" IS NULL;

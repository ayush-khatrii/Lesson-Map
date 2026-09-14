-- Lesson body text. Nullable so existing rows stay valid and the UI can
-- distinguish "no description yet" from an empty string.
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Creator social profile links (user) and the per-course toggle that controls
-- whether those links appear on that course's public page.
--
-- All columns are additive. The toggle defaults to true so existing courses keep
-- showing links once a creator fills them in; nothing renders until then.

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "socialInstagram" TEXT,
  ADD COLUMN IF NOT EXISTS "socialLinkedin" TEXT,
  ADD COLUMN IF NOT EXISTS "socialYoutube" TEXT,
  ADD COLUMN IF NOT EXISTS "socialGithub" TEXT,
  ADD COLUMN IF NOT EXISTS "socialTwitter" TEXT,
  ADD COLUMN IF NOT EXISTS "socialWebsite" TEXT;

ALTER TABLE "Course"
  ADD COLUMN IF NOT EXISTS "showSocialLinks" BOOLEAN NOT NULL DEFAULT true;

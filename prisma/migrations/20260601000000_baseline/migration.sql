-- Baseline migration.
--
-- The original Course/Module/Lesson tables were created with `prisma db push`
-- before migrations were introduced, so the history began at
-- 20260622193000_add_lesson_resources, which assumes these tables already
-- exist. That made every from-scratch replay (shadow database, fresh
-- environment, CI) fail with: relation "Lesson" does not exist.
--
-- This baseline restores the missing starting point. It is intentionally
-- idempotent: on the existing database every statement is a no-op, so applying
-- it there only records it in _prisma_migrations. Tables and columns that later
-- migrations introduce (Resource, WebhookEvent, AiGeneration, rateLimit and the
-- columns they add) are deliberately NOT created here, so those migrations stay
-- valid on a fresh database.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE', 'CREATOR', 'PROFESSIONAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "user" (
    "id"                TEXT NOT NULL,
    "name"              TEXT NOT NULL,
    "email"             TEXT NOT NULL,
    "emailVerified"     BOOLEAN NOT NULL DEFAULT false,
    "image"             TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan"              "Plan" NOT NULL DEFAULT 'FREE',
    "subscriptionId"    TEXT,
    "customerId"        TEXT,
    "subscriptionStatus" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Course" (
    "id"          TEXT NOT NULL,
    "courseName"  TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPublic"    BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "shareSlug"   TEXT,
    "userId"      TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Module" (
    "id"          TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "moduleName"  TEXT NOT NULL,
    "order"       INTEGER NOT NULL,
    "courseId"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Lesson" (
    "id"         TEXT NOT NULL,
    "lessonName" TEXT NOT NULL,
    "order"      INTEGER NOT NULL,
    "moduleId"   TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "example" (
    "id"             TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "description"    TEXT NOT NULL,
    "category"       TEXT,
    "tags"           TEXT[],
    "templateData"   JSONB NOT NULL DEFAULT '{}',
    "isPublished"    BOOLEAN NOT NULL DEFAULT true,
    "difficulty"     TEXT,
    "estimatedHours" INTEGER,
    "usageCount"     INTEGER NOT NULL DEFAULT 0,
    "createdBy"      TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "example_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "session" (
    "id"        TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token"     TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId"    TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "account" (
    "id"                    TEXT NOT NULL,
    "accountId"             TEXT NOT NULL,
    "providerId"            TEXT NOT NULL,
    "userId"                TEXT NOT NULL,
    "accessToken"           TEXT,
    "refreshToken"          TEXT,
    "idToken"               TEXT,
    "accessTokenExpiresAt"  TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope"                 TEXT,
    "password"              TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "verification" (
    "id"         TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value"      TEXT NOT NULL,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "user_subscriptionId_key" ON "user"("subscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "user_customerId_key" ON "user"("customerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Course_shareSlug_key" ON "Course"("shareSlug");
CREATE INDEX IF NOT EXISTS "example_category_idx" ON "example"("category");
CREATE INDEX IF NOT EXISTS "example_isPublished_idx" ON "example"("isPublished");
CREATE UNIQUE INDEX IF NOT EXISTS "session_token_key" ON "session"("token");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Course" ADD CONSTRAINT "Course_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

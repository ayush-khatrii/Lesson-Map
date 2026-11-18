CREATE TABLE "UploadAllocation" (
  "key" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "size" INTEGER NOT NULL CHECK ("size" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "savedAt" TIMESTAMP(3),
  CONSTRAINT "UploadAllocation_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "UploadAllocation_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UploadAllocation_userId_idx" ON "UploadAllocation"("userId");
CREATE INDEX "UploadAllocation_savedAt_createdAt_key_idx"
  ON "UploadAllocation"("savedAt", "createdAt", "key");

-- Count existing files without modifying or deleting their resource records.
-- Unknown sizes conservatively occupy one maximum-size file until removed.
INSERT INTO "UploadAllocation" ("key", "userId", "lessonId", "size", "createdAt", "savedAt")
SELECT DISTINCT ON (r."key") r."key", c."userId", r."lessonId",
  CASE WHEN r."size" > 0 THEN r."size" ELSE 26214400 END,
  r."createdAt", CURRENT_TIMESTAMP
FROM "Resource" r
JOIN "Lesson" l ON l."id" = r."lessonId"
JOIN "Module" m ON m."id" = l."moduleId"
JOIN "Course" c ON c."id" = m."courseId"
WHERE r."key" LIKE 'lesson-resources/%'
ORDER BY r."key", (CASE WHEN r."size" > 0 THEN r."size" ELSE 26214400 END) DESC;

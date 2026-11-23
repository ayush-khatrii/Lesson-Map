ALTER TABLE "Course" ADD COLUMN "offerEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "offerUrl" TEXT, ADD COLUMN "offerHeading" TEXT,
ADD COLUMN "offerDescription" TEXT, ADD COLUMN "offerButtonLabel" TEXT;
CREATE INDEX "CourseEvent_courseId_createdAt_idx" ON "CourseEvent"("courseId", "createdAt");
CREATE INDEX "Lead_courseId_createdAt_idx" ON "Lead"("courseId", "createdAt");

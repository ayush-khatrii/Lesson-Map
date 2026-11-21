ALTER TABLE "Lesson"
  ADD COLUMN "estimatedCompletionSeconds" INTEGER,
  ADD COLUMN "videoDurationSeconds" INTEGER;

ALTER TABLE "Lesson"
  ADD CONSTRAINT "Lesson_estimatedCompletionSeconds_positive" CHECK ("estimatedCompletionSeconds" > 0),
  ADD CONSTRAINT "Lesson_videoDurationSeconds_positive" CHECK ("videoDurationSeconds" > 0);

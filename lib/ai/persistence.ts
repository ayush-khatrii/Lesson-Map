import { randomUUID } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import type { GeneratedCourse } from "./schema";

// Allow for database latency while keeping the transaction bounded. The AI
// provider is always called before this transaction starts.
export const AI_SAVE_TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 15_000 };

// The caller has already saved the course in this transaction. Persist parents
// before children with explicit IDs, using two batched writes for any outline
// size. A failure still rolls back the entire course/revision and its status.
export async function createAiModules(
  tx: Prisma.TransactionClient,
  courseId: string,
  modules: GeneratedCourse["modules"],
) {
  const rows = modules.map((module, index) => ({
    id: randomUUID(),
    courseId,
    moduleName: module.moduleName,
    description: module.description,
    order: index + 1,
  }));
  await tx.module.createMany({ data: rows });
  await tx.lesson.createMany({
    data: modules.flatMap((module, index) => module.lessons.map((lesson, lessonIndex) => ({
      moduleId: rows[index].id,
      lessonName: lesson.lessonName,
      order: lessonIndex + 1,
    }))),
  });
}

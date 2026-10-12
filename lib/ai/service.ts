import { createHash } from "node:crypto";
import { db } from "@/lib/prisma";
import { lockCourseOwner } from "@/lib/course-access";
import {
  AI_LIMITS,
  effectiveAiPlan,
  monthWindow,
  type AiPlan,
  type GenerateCourseInput,
  type OutlineShape,
  type ReviseCourseInput,
} from "./schema";
import { AiError } from "./http";
import { generateCourse, reviseCourse } from "./deepseek";
import { COURSE_LIMITS } from "@/lib/plans";
import type { Prisma } from "@/app/generated/prisma/client";

const REQUEST_LIFETIME_MS = 180_000;

export function assertPlanAllows(plan: AiPlan, input: OutlineShape) {
  const limits = AI_LIMITS[plan];
  if (
    (limits.modules !== null && input.moduleCount > limits.modules) ||
    (limits.lessonsPerModule !== null && input.lessonsPerModule > limits.lessonsPerModule)
  ) {
    throw new AiError(403, "Free AI includes one module and one lesson. Upgrade to Creator for a full course.");
  }
}

// Shared allowance guard for fresh generation and AI-assisted revision. The caller
// runs it inside a transaction so the check and the reservation stay atomic.
async function assertWithinAiAllowance(
  tx: Prisma.TransactionClient,
  userId: string,
  plan: AiPlan,
  now = new Date(),
) {
  const latest = await tx.aiGeneration.findFirst({
    // Failed attempts never reach the user, so they must not block a retry.
    where: { userId, status: { not: "FAILED" } }, orderBy: { createdAt: "desc" },
  });
  if (latest) {
    const elapsed = now.getTime() - latest.createdAt.getTime();
    const delay = latest.status === "PENDING" ? REQUEST_LIFETIME_MS : 15_000;
    if (elapsed < delay) {
      throw new AiError(429, "Please wait before starting another generation.", Math.ceil((delay - elapsed) / 1000));
    }
  }
  const { start, end } = monthWindow(now);
  // Failed generations are refunded automatically: only attempts that reached
  // the user (or are still running) count toward the monthly allowance.
  const attempts = await tx.aiGeneration.count({
    where: { userId, createdAt: { gte: start, lt: end }, status: { not: "FAILED" } },
  });
  if (attempts >= AI_LIMITS[plan].monthlyAttempts) {
    throw new AiError(429, "Your monthly AI allowance is used up. It resets next month.");
  }
}

export async function getAiAllowance(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AiError(401, "Please sign in again.");
  const plan = effectiveAiPlan(user);
  const limits = AI_LIMITS[plan];
  const { start, end } = monthWindow();
  // Only generations that actually reach the user count against the allowance.
  // Attempts that fail (provider errors, timeouts, invalid output) are free.
  const used = await db.aiGeneration.count({
    where: { userId, createdAt: { gte: start, lt: end }, status: { not: "FAILED" } },
  });
  return {
    plan,
    limits,
    remaining: Math.max(0, limits.monthlyAttempts - used),
    resetsAt: end.toISOString(),
    enabled: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
  };
}

export async function createAiCourse(userId: string, input: GenerateCourseInput, database = db) {
  const { requestId, ...requirements } = input;
  const inputHash = createHash("sha256").update(JSON.stringify(requirements)).digest("hex");

  const userExists = await database.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) throw new AiError(401, "Please sign in again.");

  // Reserve before spending tokens. Database locks work across server instances.
  const reservation = await database.$transaction(async (tx) => {
    const user = await lockCourseOwner(tx, userId);
    if (!user) throw new AiError(401, "Please sign in again.");
    const existing = await tx.aiGeneration.findUnique({
      where: { userId_requestId: { userId, requestId } },
    });
    if (existing) {
      if (existing.inputHash !== inputHash) {
        throw new AiError(409, "This request was already used for different course details.", undefined, true);
      }
      if (existing.status === "SUCCEEDED" && existing.courseId) {
        const course = await tx.course.findFirst({
          where: { id: existing.courseId, userId }, select: { id: true },
        });
        if (!course) throw new AiError(410, "This generated course was deleted.", undefined, true);
        return { courseId: course.id, generationId: existing.id };
      }
      if (existing.status === "PENDING" && existing.createdAt.getTime() + REQUEST_LIFETIME_MS > Date.now()) {
        throw new AiError(409, "Your course is still generating. Retry shortly to open it.", 10);
      }
      throw new AiError(409, "The previous attempt did not finish. Please start a new attempt.", undefined, true);
    }

    const plan = effectiveAiPlan(user);
    assertPlanAllows(plan, input);
    if (!process.env.DEEPSEEK_API_KEY?.trim()) {
      throw new AiError(503, "AI generation is not configured yet.");
    }
    const courseLimit = COURSE_LIMITS[plan];
    if (await tx.course.count({ where: { userId } }) >= courseLimit) {
      throw new AiError(403, `You have reached your plan limit of ${courseLimit} courses.`);
    }
    await assertWithinAiAllowance(tx, userId, plan);
    const generation = await tx.aiGeneration.create({
      data: { userId, requestId, inputHash },
    });
    return { generationId: generation.id, courseId: null };
  });

  // Replaying a completed request never calls DeepSeek or creates a second course.
  if (reservation.courseId) return { courseId: reservation.courseId, replayed: true };
  try {
    const { course, usage } = await generateCourse(input);
    // Preserve usage even if the final save fails or the subscription has changed.
    await database.aiGeneration.update({
      where: { id: reservation.generationId },
      data: { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens },
    });
    const created = await database.$transaction(async (tx) => {
      const user = await lockCourseOwner(tx, userId);
      if (!user) throw new AiError(401, "Please sign in again.");
      const userRow = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!userRow) throw new AiError(401, "Please sign in again.");
      const plan = effectiveAiPlan(user);
      assertPlanAllows(plan, input);
      const courseLimit = COURSE_LIMITS[plan];
      if (await tx.course.count({ where: { userId } }) >= courseLimit) {
        throw new AiError(403, `Your ${courseLimit} course slots are full. No AI course was saved.`);
      }
      const generation = await tx.aiGeneration.findUniqueOrThrow({ where: { id: reservation.generationId } });
      if (generation.status !== "PENDING" || generation.createdAt.getTime() + REQUEST_LIFETIME_MS <= Date.now()) {
        throw new AiError(409, "This generation expired. Please start a new attempt.");
      }
      // One nested write: either the entire private outline saves or none does.
      const created = await tx.course.create({
        data: {
          userId,
          courseName: course.courseName,
          description: course.description,
          audience: input.audience,
          isPublic: false,
          isPublished: false,
          Module: {
            create: course.modules.map((module, moduleIndex) => ({
              moduleName: module.moduleName,
              description: module.description,
              order: moduleIndex + 1,
              Lesson: {
                create: module.lessons.map((lesson, lessonIndex) => ({
                  lessonName: lesson.lessonName,
                  order: lessonIndex + 1,
                })),
              },
            })),
          },
        },
        select: { id: true },
      });
      await tx.aiGeneration.update({
        where: { id: reservation.generationId },
        data: { status: "SUCCEEDED", courseId: created.id },
      });
      return created;
    });
    return { courseId: created.id, replayed: false };
  } catch (error) {
    await database.aiGeneration.updateMany({
      where: { id: reservation.generationId, status: "PENDING" },
      data: { status: "FAILED" },
    }).catch(() => console.error("Could not mark AI attempt failed"));
    if (error instanceof AiError) error.newRequest = true;
    throw error;
  }
}


export async function editAiCourse(userId: string, input: ReviseCourseInput, database = db) {
  const { requestId, ...requirements } = input;
  const inputHash = createHash("sha256").update(JSON.stringify(requirements)).digest("hex");

  const reservation = await database.$transaction(async (tx) => {
    const user = await lockCourseOwner(tx, userId);
    if (!user) throw new AiError(401, "Please sign in again.");
    const existing = await tx.aiGeneration.findUnique({
      where: { userId_requestId: { userId, requestId } },
    });
    if (existing) {
      if (existing.inputHash !== inputHash) {
        throw new AiError(409, "This request was already used for different instructions.", undefined, true);
      }
      if (existing.status === "SUCCEEDED" && existing.courseId) {
        const course = await tx.course.findFirst({
          where: { id: existing.courseId, userId }, select: { id: true },
        });
        if (!course) throw new AiError(410, "This course was deleted.", undefined, true);
        return { courseId: course.id, generationId: existing.id };
      }
      if (existing.status === "PENDING" && existing.createdAt.getTime() + REQUEST_LIFETIME_MS > Date.now()) {
        throw new AiError(409, "Your course is still updating. Retry shortly to open it.", 10);
      }
      throw new AiError(409, "The previous attempt did not finish. Please start a new attempt.", undefined, true);
    }

    const plan = effectiveAiPlan(user);
    assertPlanAllows(plan, input);
    if (!process.env.DEEPSEEK_API_KEY?.trim()) {
      throw new AiError(503, "AI generation is not configured yet.");
    }
    const course = await tx.course.findFirst({
      where: { id: input.courseId, userId }, select: { id: true },
    });
    if (!course) throw new AiError(404, "Course not found.");
    await assertWithinAiAllowance(tx, userId, plan);
    const generation = await tx.aiGeneration.create({
      data: { userId, requestId, inputHash, courseId: input.courseId },
    });
    return { generationId: generation.id, courseId: null };
  });

  // Replaying a completed revision opens the same course without calling DeepSeek.
  if (reservation.courseId) return { courseId: reservation.courseId, replayed: true };

  try {
    const current = await database.course.findFirst({
      where: { id: input.courseId, userId },
      include: {
        Module: {
          orderBy: { order: "asc" },
          include: { Lesson: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!current) throw new AiError(404, "Course not found.");

    const { course, usage } = await reviseCourse(input, {
      title: current.courseName,
      description: current.description,
      audience: current.audience ?? "",
      modules: current.Module.map((module) => ({
        moduleName: module.moduleName,
        description: module.description,
        lessons: module.Lesson.map((lesson) => lesson.lessonName),
      })),
    });

    // Preserve usage even if the final save fails.
    await database.aiGeneration.update({
      where: { id: reservation.generationId },
      data: { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens },
    });

    await database.$transaction(async (tx) => {
      const user = await lockCourseOwner(tx, userId);
      if (!user) throw new AiError(401, "Please sign in again.");
      const owned = await tx.course.findFirst({
        where: { id: input.courseId, userId }, select: { id: true },
      });
      if (!owned) throw new AiError(404, "Course not found.");
      const generation = await tx.aiGeneration.findUniqueOrThrow({ where: { id: reservation.generationId } });
      if (generation.status !== "PENDING" || generation.createdAt.getTime() + REQUEST_LIFETIME_MS <= Date.now()) {
        throw new AiError(409, "This generation expired. Please start a new attempt.");
      }
      // Replace the outline atomically: the old modules (and their lessons) are
      // removed, then the revised structure is written in the same transaction.
      await tx.module.deleteMany({ where: { courseId: input.courseId } });
      await tx.course.update({
        where: { id: input.courseId },
        data: {
          ...(input.rewriteMeta ? { courseName: course.courseName, description: course.description } : {}),
          Module: {
            create: course.modules.map((module, moduleIndex) => ({
              moduleName: module.moduleName,
              description: module.description,
              order: moduleIndex + 1,
              Lesson: {
                create: module.lessons.map((lesson, lessonIndex) => ({
                  lessonName: lesson.lessonName,
                  order: lessonIndex + 1,
                })),
              },
            })),
          },
        },
      });
      await tx.aiGeneration.update({
        where: { id: reservation.generationId },
        data: { status: "SUCCEEDED" },
      });
    });

    return { courseId: input.courseId, replayed: false };
  } catch (error) {
    await database.aiGeneration.updateMany({
      where: { id: reservation.generationId, status: "PENDING" },
      data: { status: "FAILED" },
    }).catch(() => console.error("Could not mark AI edit failed"));
    if (error instanceof AiError) error.newRequest = true;
    throw error;
  }
}

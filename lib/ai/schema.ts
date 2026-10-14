import { z } from "zod";

type AiLimits = {
  modules: number | null;
  lessonsPerModule: number | null;
  monthlyAttempts: number;
};

// null means there is no plan-level module or lesson limit. The server still
// applies a per-request safety limit so one AI response remains reliable.
export const AI_LIMITS = {
  FREE: { modules: 1, lessonsPerModule: 1, monthlyAttempts: 5 },
  CREATOR: { modules: null, lessonsPerModule: null, monthlyAttempts: 200 },
  PROFESSIONAL: { modules: null, lessonsPerModule: null, monthlyAttempts: 200 },
} as const satisfies Record<string, AiLimits>;

// Modules count too: 25 modules with 5 lessons each use all 150 items.
export const MAX_AI_OUTLINE_ITEMS = 150;

export type AiPlan = keyof typeof AI_LIMITS;

export function effectiveAiPlan(user: {
  plan: AiPlan;
  subscriptionStatus: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  subscriptionCurrentPeriodEnd: Date | null;
}): AiPlan {
  if (
    user.plan !== "FREE" &&
    user.subscriptionStatus === "active" &&
    !user.subscriptionCancelAtPeriodEnd
  ) return user.plan;
  return "FREE";
}

// Shared shape for the outline-size driven schemas. Both fresh course generation
// and AI-assisted revision describe how many modules and lessons the model must return.
export type OutlineShape = { moduleCount: number; lessonsPerModule: number };

const outlineShapeRefinement = (input: OutlineShape, context: z.RefinementCtx) => {
  const outlineItems = input.moduleCount * (input.lessonsPerModule + 1);
  if (outlineItems > MAX_AI_OUTLINE_ITEMS) {
    context.addIssue({
      code: "custom",
      path: ["lessonsPerModule"],
      message: `One AI request can generate up to ${MAX_AI_OUTLINE_ITEMS} total modules and lessons. You can add unlimited items manually afterward.`,
    });
  }
};

export const generateCourseSchema = z.strictObject({
  requestId: z.string().uuid(),
  type: z.literal("course"),
  topic: z.string().trim().min(3).max(500),
  audience: z.string().trim().min(3).max(200),
  moduleCount: z.number().int().min(1).max(MAX_AI_OUTLINE_ITEMS),
  lessonsPerModule: z.number().int().min(1).max(MAX_AI_OUTLINE_ITEMS),
}).superRefine(outlineShapeRefinement);

export type GenerateCourseInput = z.infer<typeof generateCourseSchema>;

export const reviseCourseSchema = z.strictObject({
  requestId: z.string().uuid(),
  courseId: z.string().trim().min(1).max(100),
  instructions: z.string().trim().min(3).max(1000),
  moduleCount: z.number().int().min(1).max(MAX_AI_OUTLINE_ITEMS),
  lessonsPerModule: z.number().int().min(1).max(MAX_AI_OUTLINE_ITEMS),
  rewriteMeta: z.boolean().default(false),
}).superRefine(outlineShapeRefinement);

export type ReviseCourseInput = z.infer<typeof reviseCourseSchema>;

export function courseOutputSchema(input: OutlineShape) {
  return z.strictObject({
    courseName: z.string().trim().min(3).max(120),
    description: z.string().trim().min(20).max(1200),
    modules: z.array(z.strictObject({
      moduleName: z.string().trim().min(3).max(120),
      description: z.string().trim().min(10).max(500),
      lessons: z.array(z.strictObject({
        lessonName: z.string().trim().min(3).max(120),
      })).length(input.lessonsPerModule),
    })).length(input.moduleCount),
  });
}

export type GeneratedCourse = z.infer<ReturnType<typeof courseOutputSchema>>;

// Small requests are generated in a single call. Larger courses generate their
// outline first, then lessons in small parallel batches to limit response size.
export const SINGLE_CALL_MODULE_LIMIT = 3;
export const MAX_MODULES_PER_AI_CALL = 4;

export function outlineOutputSchema(input: OutlineShape) {
  return z.strictObject({
    courseName: z.string().trim().min(3).max(120),
    description: z.string().trim().min(20).max(1200),
    modules: z.array(z.strictObject({
      moduleName: z.string().trim().min(3).max(120),
      description: z.string().trim().min(10).max(500),
    })).length(input.moduleCount),
  });
}

export function lessonsOutputSchema(moduleCount: number, lessonsPerModule: number) {
  return z.strictObject({
    modules: z.array(z.strictObject({
      moduleName: z.string().trim().min(1).max(200),
      lessons: z.array(z.strictObject({
        lessonName: z.string().trim().min(3).max(120),
      })).length(lessonsPerModule),
    })).length(moduleCount),
  });
}

export function monthWindow(now = new Date()) {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

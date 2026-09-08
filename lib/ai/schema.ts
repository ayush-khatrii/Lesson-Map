import { z } from "zod";

// Shared with the UI. The server always checks these limits again.
export const AI_LIMITS = {
  FREE: { modules: 1, lessonsPerModule: 1, monthlyAttempts: 5 },
  CREATOR: { modules: 8, lessonsPerModule: 6, monthlyAttempts: 200 },
  PROFESSIONAL: { modules: 8, lessonsPerModule: 6, monthlyAttempts: 200 },
} as const;

export type AiPlan = keyof typeof AI_LIMITS;

export function effectiveAiPlan(user: {
  plan: AiPlan;
  subscriptionStatus: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  subscriptionCurrentPeriodEnd: Date | null;
}, now = new Date()): AiPlan {
  const paidPeriodContinues =
    user.subscriptionCancelAtPeriodEnd &&
    user.subscriptionCurrentPeriodEnd !== null &&
    user.subscriptionCurrentPeriodEnd > now;
  const paidPeriodExpired =
    user.subscriptionCancelAtPeriodEnd &&
    (!user.subscriptionCurrentPeriodEnd || user.subscriptionCurrentPeriodEnd <= now);

  if (user.plan !== "FREE" && !paidPeriodExpired && (
    user.subscriptionStatus === "active" ||
    (user.subscriptionStatus === "cancelled" && paidPeriodContinues)
  )) return user.plan;
  return "FREE";
}

export const generateCourseSchema = z.strictObject({
  requestId: z.string().uuid(),
  type: z.literal("course"),
  topic: z.string().trim().min(3).max(500),
  audience: z.string().trim().min(3).max(200),
  moduleCount: z.number().int().min(1).max(8),
  lessonsPerModule: z.number().int().min(1).max(6),
});

export type GenerateCourseInput = z.infer<typeof generateCourseSchema>;

export function courseOutputSchema(input: GenerateCourseInput) {
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

export function monthWindow(now = new Date()) {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

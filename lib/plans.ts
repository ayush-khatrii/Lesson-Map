// Product limits shared by server enforcement and pricing copy.
export const COURSE_LIMITS = {
  FREE: 3,
  CREATOR: "Unlimited",
  PROFESSIONAL: "Unlimited",
} as const;

export type CoursePlan = keyof typeof COURSE_LIMITS;
export type CourseLimit = typeof COURSE_LIMITS[CoursePlan];

export function hasReachedCourseLimit(courseCount: number, limit: CourseLimit) {
  return typeof limit === "number" && courseCount >= limit;
}

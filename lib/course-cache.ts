import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/prisma";

export function userCoursesTag(userId: string) {
  return `user-courses:${userId}`;
}

const courseInclude = {
  Module: {
    orderBy: { order: "asc" },
    include: {
      Lesson: {
        orderBy: { order: "asc" },
        include: { resources: true },
      },
    },
  },
} as const;

// Call only after authenticating. The verified user ID is part of the cache
// key AND the database filter, so different users never share course results.
export async function getUserCourses(userId: string) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 300 });
  cacheTag(userCoursesTag(userId));

  return db.course.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: courseInclude,
  });
}

export async function getUserCourse(userId: string, courseId: string) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 300 });
  cacheTag(userCoursesTag(userId));

  return db.course.findFirst({
    where: { id: courseId, userId },
    include: courseInclude,
  });
}

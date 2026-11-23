import "server-only";
import { db } from "@/lib/prisma";
import {
  analyticsWindow,
  buildAnalytics,
  type AnalyticsRange,
  type DailyCount,
} from "@/lib/course-analytics";

// Call only after confirming that the viewer owns the course and has paid access.
export async function getCourseAnalytics(
  course: { id: string; createdAt: Date },
  range: AnalyticsRange,
) {
  const window = analyticsWindow(range, course.createdAt);
  // Prisma timestamps are stored as UTC timestamp-without-time-zone values.
  const rows = await db.$queryRaw<DailyCount[]>`
    SELECT to_char("createdAt", 'YYYY-MM-DD') AS date,
      CASE kind WHEN 'visit' THEN 'visits' WHEN 'start' THEN 'starts' WHEN 'paid_course_click' THEN 'clicks' END AS metric,
      count(*)::int AS count
    FROM "CourseEvent" WHERE "courseId" = ${course.id} AND "createdAt" >= ${window.from} AND "createdAt" < ${window.to}
      AND kind IN ('visit', 'start', 'paid_course_click')
    GROUP BY 1, 2
    UNION ALL
    SELECT to_char("createdAt", 'YYYY-MM-DD') AS date, 'signups' AS metric, count(*)::int AS count
    FROM "Lead" WHERE "courseId" = ${course.id} AND "createdAt" >= ${window.from} AND "createdAt" < ${window.to}
    GROUP BY 1
  `;
  return buildAnalytics(range, window, rows);
}

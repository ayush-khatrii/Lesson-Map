import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { sessionUserId, launchError } from "@/lib/launch-access";
import { effectiveAiPlan } from "@/lib/ai/schema";
import {
  analyticsWindow,
  buildAnalytics,
  type DailyCount,
} from "@/lib/course-analytics";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const userId = await sessionUserId();
    if (!userId)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { courseId } = await params;
    const course = await db.course.findFirst({
      where: { id: courseId, userId },
      include: { user: true },
    });
    if (!course)
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    if (effectiveAiPlan(course.user) === "FREE")
      return NextResponse.json(
        { error: "Creator or Professional is required." },
        { status: 403 },
      );
    const range = new URL(request.url).searchParams.get("range") ?? "30d";
    if (range !== "7d" && range !== "30d" && range !== "all")
      return NextResponse.json(
        { error: "Invalid analytics range." },
        { status: 400 },
      );
    const window = analyticsWindow(range, course.createdAt);
    // Prisma timestamps are stored as UTC timestamp-without-time-zone values.
    const rows = await db.$queryRaw<DailyCount[]>`
      SELECT to_char("createdAt", 'YYYY-MM-DD') AS date,
        CASE kind WHEN 'visit' THEN 'visits' WHEN 'start' THEN 'starts' WHEN 'paid_course_click' THEN 'clicks' END AS metric,
        count(*)::int AS count
      FROM "CourseEvent" WHERE "courseId" = ${courseId} AND "createdAt" >= ${window.from} AND "createdAt" < ${window.to}
        AND kind IN ('visit', 'start', 'paid_course_click')
      GROUP BY 1, 2
      UNION ALL
      SELECT to_char("createdAt", 'YYYY-MM-DD') AS date, 'signups' AS metric, count(*)::int AS count
      FROM "Lead" WHERE "courseId" = ${courseId} AND "createdAt" >= ${window.from} AND "createdAt" < ${window.to}
      GROUP BY 1
    `;
    return NextResponse.json(buildAnalytics(range, window, rows), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return launchError(error);
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { sessionUserId, launchError } from "@/lib/launch-access";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { getCourseAnalytics } from "@/lib/course-analytics-server";

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
      select: {
        id: true,
        createdAt: true,
        user: {
          select: {
            plan: true,
            subscriptionStatus: true,
            subscriptionCancelAtPeriodEnd: true,
            subscriptionCurrentPeriodEnd: true,
          },
        },
      },
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
    return NextResponse.json(await getCourseAnalytics(course, range), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return launchError(error);
  }
}

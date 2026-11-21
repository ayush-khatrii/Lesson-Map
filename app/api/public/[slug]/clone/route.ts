import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { sessionUserId, allowRequest, launchError } from "@/lib/launch-access";
import { lockCourseOwner } from "@/lib/course-access";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { COURSE_LIMITS, hasReachedCourseLimit } from "@/lib/plans";
import { isSameOriginRequest } from "@/lib/payments/request-security";
import { revalidateTag } from "next/cache";
import { userCoursesTag } from "@/lib/course-cache";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    if (!isSameOriginRequest(request))
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    const userId = await sessionUserId();
    if (!userId)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    if (!(await allowRequest(`clone:${userId}`, 5)))
      return NextResponse.json(
        { error: "Please wait before cloning again." },
        { status: 429 },
      );
    const { slug } = await params;
    const result = await db.$transaction(async (tx) => {
      const user = await lockCourseOwner(tx, userId);
      if (!user) return { error: "User not found." };
      if (
        hasReachedCourseLimit(
          await tx.course.count({ where: { userId } }),
          COURSE_LIMITS[effectiveAiPlan(user)],
        )
      )
        return { error: "Your course limit has been reached." };
      const source = await tx.course.findFirst({
        where: { shareSlug: slug, isPublic: true },
        include: {
          Module: {
            orderBy: { order: "asc" },
            include: {
              Lesson: {
                orderBy: { order: "asc" },
                include: { resources: true },
              },
            },
          },
        },
      });
      if (!source) return { error: "Public roadmap not found." };
      const course = await tx.course.create({
        data: {
          userId,
          courseName: source.courseName,
          description: source.description,
          audience: source.audience,
          Module: {
            create: source.Module.map((module) => ({
              moduleName: module.moduleName,
              description: module.description,
              order: module.order,
              Lesson: {
                create: module.Lesson.map((lesson) => ({
                  estimatedCompletionSeconds: lesson.estimatedCompletionSeconds,
                  videoDurationSeconds: lesson.videoDurationSeconds,
                  lessonName: lesson.lessonName,
                  description: lesson.description,
                  order: lesson.order,
                  resources: {
                    create: lesson.resources
                      .filter(
                        (r) =>
                          r.type === "Link" &&
                          r.url &&
                          /^https?:\/\//i.test(r.url) &&
                          !r.key,
                      )
                      .map((r) => ({
                        name: r.name,
                        type: "Link" as const,
                        url: r.url,
                      })),
                  },
                })),
              },
            })),
          },
        },
      });
      return { courseId: course.id };
    });
    if ("error" in result) return NextResponse.json(result, { status: 403 });
    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(result);
  } catch (error) {
    return launchError(error);
  }
}

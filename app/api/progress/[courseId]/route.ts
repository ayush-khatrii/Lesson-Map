import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { sessionUserId, launchError } from "@/lib/launch-access";
import { isSameOriginRequest } from "@/lib/payments/request-security";

type Context = { params: Promise<{ courseId: string }> };
async function accessibleCourse(courseId: string, userId: string) {
  return db.course.findFirst({
    where: {
      OR: [{ id: courseId }, { shareSlug: courseId }],
      AND: [{ OR: [{ userId }, { isPublic: true }] }],
    },
    select: { id: true },
  });
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const userId = await sessionUserId();
    if (!userId)
      return NextResponse.json(
        { error: "Sign in to save your progress." },
        { status: 401 },
      );
    const { courseId } = await params;
    const course = await accessibleCourse(courseId, userId);
    if (!course)
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    const progress = await db.lessonProgress.findMany({
      where: { userId, lesson: { module: { courseId: course.id } } },
      select: { lessonId: true, startedAt: true, completedAt: true },
    });
    return NextResponse.json(
      { progress },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return launchError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    if (!isSameOriginRequest(request))
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    const userId = await sessionUserId();
    if (!userId)
      return NextResponse.json(
        { error: "Sign in to save your progress." },
        { status: 401 },
      );
    const body = z
      .object({
        lessonId: z.string().min(1).max(100),
        completed: z.boolean().optional(),
      })
      .safeParse(await request.json().catch(() => null));
    if (!body.success)
      return NextResponse.json({ error: "Invalid progress." }, { status: 400 });
    const { courseId } = await params;
    const course = await accessibleCourse(courseId, userId);
    if (!course)
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    const lesson = await db.lesson.findFirst({
      where: { id: body.data.lessonId, module: { courseId: course.id } },
      select: { id: true },
    });
    if (!lesson)
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    const completedAt =
      body.data.completed === undefined
        ? undefined
        : body.data.completed
          ? new Date()
          : null;
    const progress = await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      create: { userId, lessonId: lesson.id, completedAt },
      update: {
        updatedAt: new Date(),
        ...(body.data.completed === undefined ? {} : { completedAt }),
      },
      select: { lessonId: true, startedAt: true, completedAt: true },
    });
    return NextResponse.json({ progress });
  } catch (error) {
    return launchError(error);
  }
}

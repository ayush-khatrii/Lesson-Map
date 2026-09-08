import { db } from "@/lib/prisma";
import { userCoursesTag } from "@/lib/course-cache";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateUniqueShareSlug } from "@/lib/slug";

interface Context {
  params: Promise<{ courseId: string }>;
}

function getPublicCourseUrl(shareSlug: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/p/${shareSlug}`;
}

async function getSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.session.userId ?? null;
}

async function getOwnedCourse(courseId: string, userId: string) {
  return db.course.findFirst({
    where: { id: courseId, userId },
    select: {
      id: true,
      courseName: true,
      isPublic: true,
      shareSlug: true,
      _count: { select: { Module: true } },
    },
  });
}

function publishResponse(shareSlug: string, isPublic: boolean) {
  return NextResponse.json(
    {
      shareSlug,
      publicUrl: getPublicCourseUrl(shareSlug),
      isPublic,
    },
    { status: 200 },
  );
}

/** Make a course public. Idempotent — safe to call when already public. */
export async function POST(_: Request, context: Context) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 },
    );
  }

  const { courseId } = await context.params;

  try {
    const course = await getOwnedCourse(courseId, userId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course._count.Module === 0) {
      return NextResponse.json(
        { error: "Add at least one module before publishing your course." },
        { status: 422 },
      );
    }

    if (course.isPublic && course.shareSlug) {
      return publishResponse(course.shareSlug, true);
    }

    const shareSlug =
      course.shareSlug ??
      (await generateUniqueShareSlug(course.courseName, courseId));

    const updated = await db.course.update({
      where: { id: courseId },
      data: { isPublic: true, shareSlug },
      select: { shareSlug: true, isPublic: true },
    });

    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return publishResponse(updated.shareSlug!, updated.isPublic);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to publish course", details: (error as Error).message },
      { status: 500 },
    );
  }
}

/** Make a course private. Keeps shareSlug so re-publishing restores the same URL. */
export async function DELETE(_: Request, context: Context) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 },
    );
  }

  const { courseId } = await context.params;

  try {
    const course = await getOwnedCourse(courseId, userId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (!course.isPublic) {
      return NextResponse.json(
        {
          shareSlug: course.shareSlug,
          isPublic: false,
        },
        { status: 200 },
      );
    }

    const updated = await db.course.update({
      where: { id: courseId },
      data: { isPublic: false },
      select: { shareSlug: true, isPublic: true },
    });

    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(
      {
        shareSlug: updated.shareSlug,
        isPublic: updated.isPublic,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to unpublish course", details: (error as Error).message },
      { status: 500 },
    );
  }
}

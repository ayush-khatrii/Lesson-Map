import { db } from "@/lib/prisma";
import { userCoursesTag } from "@/lib/course-cache";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { lessonSchema } from "@/lib/validation";

interface Context {
  params: Promise<{ lessonId: string }>;
}

// GET — Get a single lesson
export async function GET(_: Request, context: Context) {
  const { lessonId } = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const lesson = await db.lesson.findFirst({
      where: { id: lessonId, module: { course: { userId } } },
      include: { module: true, resources: true },
    });

    if (!lesson)
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    return NextResponse.json(lesson, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch lesson", details: (error as Error).message },
      { status: 500 }
    );
  }
}

//  PUT — Update a lesson
export async function PUT(req: Request, context: Context) {
  const { lessonId } = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = lessonSchema.safeParse(body);

    if (!result.success) {
      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", details: formattedErrors },
        { status: 400 }
      );
    }

    const lessonExists = await db.lesson.findFirst({
      where: { id: lessonId, module: { course: { userId } } },
    });

    if (!lessonExists)
      return NextResponse.json(
        { error: "Lesson not found or unauthorized" },
        { status: 404 }
      );

    const updated = await db.lesson.update({
      where: { id: lessonId },
      data: {
        lessonName: result.data.lessonName,
        order: result.data.order,
      },
    });

    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update lesson", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE — Delete a lesson
export async function DELETE(_: Request, context: Context) {
  const { lessonId } = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const lessonExists = await db.lesson.findFirst({
      where: { id: lessonId, module: { course: { userId } } },
    });

    if (!lessonExists)
      return NextResponse.json(
        { error: "Lesson not found or unauthorized" },
        { status: 404 }
      );

    await db.lesson.delete({ where: { id: lessonId } });

    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(
      { message: "Lesson deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete lesson", details: (error as Error).message },
      { status: 500 }
    );
  }
}

import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateCourseSchema } from "@/lib/validation";

interface Context {
  params: Promise<{ courseId: string }>;
}

//  Get specific course with its modules
export async function GET(_: Request, context: Context) {
  const { courseId } = await context.params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userID = session?.session.userId;
  if (!userID) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 }
    );
  }

  try {
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        userId: userID,
      },
      include: {
        Module: {
          include: {
            Lesson: {
              include: {
                resources: true,
              },
            },
          },
        },
      },
    });

    if (!course)
      return NextResponse.json({ error: "Course not found" }, { status: 404 });

    return NextResponse.json(course, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch course", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - Update a course
export async function PUT(req: Request, context: Context) {
  const { courseId } = await context.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.session.userId;
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const result = updateCourseSchema.safeParse(body);

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

    const courseExists = await db.course.findFirst({
      where: { id: courseId, userId },
      select: { id: true },
    });

    if (!courseExists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const updateData: {
      courseName?: string;
      description?: string;
    } = {};

    if (result.data.courseName !== undefined) {
      updateData.courseName = result.data.courseName;
    }
    if (result.data.description !== undefined) {
      updateData.description = result.data.description;
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const updated = await db.course.update({
      where: { id: courseId },
      data: updateData,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update course", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a course
export async function DELETE(_: Request, context: Context) {
  const { courseId } = await context.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.session.userId;
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 }
    );
  }

  try {
    const deleted = await db.course.deleteMany({
      where: { id: courseId, userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Course deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete course", details: (error as Error).message },
      { status: 500 }
    );
  }
}

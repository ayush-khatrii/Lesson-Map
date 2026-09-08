import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { userCoursesTag } from "@/lib/course-cache";
import { revalidateTag } from "next/cache";
import { createResourceSchema } from "@/lib/validation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 },
    );
  }

  try {
    const resources = await db.resource.findMany({
      where: {
        lesson: {
          module: {
            course: { userId },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(resources, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch resources",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 },
    );
  }

  try {
    const result = createResourceSchema.safeParse(await request.json());

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const lesson = await db.lesson.findFirst({
      where: {
        id: result.data.lessonId,
        module: { course: { userId } },
      },
      select: { id: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const resource = await db.resource.create({
      data: result.data,
    });

    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create resource",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

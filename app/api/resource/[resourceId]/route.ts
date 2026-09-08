import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { userCoursesTag } from "@/lib/course-cache";
import { revalidateTag } from "next/cache";
import { updateResourceSchema } from "@/lib/validation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface Context {
  params: Promise<{ resourceId: string }>;
}

export async function GET(_: Request, context: Context) {
  const { resourceId } = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 },
    );
  }

  try {
    const resource = await db.resource.findFirst({
      where: {
        id: resourceId,
        lesson: {
          module: {
            course: { userId },
          },
        },
      },
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    return NextResponse.json(resource, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch resource",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: Context) {
  const { resourceId } = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 },
    );
  }

  try {
    const result = updateResourceSchema.safeParse(await request.json());

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

    const resource = await db.resource.findFirst({
      where: {
        id: resourceId,
        lesson: {
          module: {
            course: { userId },
          },
        },
      },
      select: { id: true },
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const updated = await db.resource.update({
      where: { id: resourceId },
      data: result.data,
    });

    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to update resource",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, context: Context) {
  const { resourceId } = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 },
    );
  }

  try {
    const resource = await db.resource.findFirst({
      where: {
        id: resourceId,
        lesson: {
          module: {
            course: { userId },
          },
        },
      },
      select: { id: true },
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    await db.resource.delete({ where: { id: resourceId } });

    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(
      { message: "Resource deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to delete resource",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

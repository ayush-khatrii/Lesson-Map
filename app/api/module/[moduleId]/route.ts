import { db } from "@/lib/prisma";
import { userCoursesTag } from "@/lib/course-cache";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { moduleSchema } from "@/lib/validation";

interface Context {
  params: Promise<{ moduleId: string }>;
}

// GET — Get a single module
export async function GET(_: Request, context: Context) {
  const { moduleId } = await context.params;

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 }
    );
  }

  try {
    const module = await db.module.findFirst({
      where: { id: moduleId, course: { userId } },
      include: {
        Lesson: {
          include: {
            resources: true,
          },
        },
      },
    });

    if (!module)
      return NextResponse.json({ error: "Module not found" }, { status: 404 });

    return NextResponse.json(module, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch module", details: (error as Error).message },
      { status: 500 }
    );
  }
}

//  PUT — Update module
export async function PUT(req: Request, context: Context) {
  const { moduleId } = await context.params;

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const result = moduleSchema.safeParse(body);

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

    const moduleExists = await db.module.findFirst({
      where: { id: moduleId, course: { userId } },
    });

    if (!moduleExists) {
      return NextResponse.json(
        { error: "Module not found or unauthorized access" },
        { status: 404 }
      );
    }

    const updated = await db.module.update({
      where: { id: moduleId },
      data: {
        moduleName: result.data.moduleName,
        description: result.data.description,
        order: result.data.order,
      },
    });

    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update module", details: (error as Error).message },
      { status: 500 }
    );
  }
}

//   DELETE — Delete a module
export async function DELETE(_: Request, context: Context) {
  const { moduleId } = await context.params;

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 }
    );
  }

  try {
    const moduleExists = await db.module.findFirst({
      where: { id: moduleId, course: { userId } },
    });

    if (!moduleExists) {
      return NextResponse.json(
        { error: "Module not found or unauthorized access" },
        { status: 404 }
      );
    }

    await db.module.delete({
      where: { id: moduleId },
    });

    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(
      { message: "Module deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete module", details: (error as Error).message },
      { status: 500 }
    );
  }
}

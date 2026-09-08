import { db } from "@/lib/prisma";
import { userCoursesTag } from "@/lib/course-cache";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { createResourceSchema } from "@/lib/validation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function buildPublicUrl(key: string) {
  const baseUrl = process.env.CF_R2_PUBLIC_URL;
  if (!baseUrl) return key;

  return `${baseUrl.replace(/\/$/, "")}/${key}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized! Please login to continue" },
        { status: 401 },
      );
    }

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
      data: {
        ...result.data,
        url: result.data.key ? buildPublicUrl(result.data.key) : result.data.url,
      },
    });

    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save resource", details: (error as Error).message },
      { status: 500 },
    );
  }
}

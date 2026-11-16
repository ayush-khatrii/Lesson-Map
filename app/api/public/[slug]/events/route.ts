import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { sessionUserId, allowRequest, launchError } from "@/lib/launch-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const body = z
      .object({
        sessionId: z.string().uuid(),
        kind: z.enum(["visit", "start"]),
      })
      .safeParse(await request.json().catch(() => null));
    if (!body.success)
      return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    const { slug } = await params;
    const course = await db.course.findFirst({
      where: { shareSlug: slug, isPublic: true },
      select: { id: true, userId: true },
    });
    if (!course)
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    if ((await sessionUserId()) === course.userId)
      return NextResponse.json({ ok: true });
    if (!(await allowRequest(`event:${course.id}`, 300)))
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 },
      );
    await db.courseEvent.upsert({
      where: { courseId_sessionId_kind: { courseId: course.id, ...body.data } },
      create: { courseId: course.id, ...body.data },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return launchError(error);
  }
}

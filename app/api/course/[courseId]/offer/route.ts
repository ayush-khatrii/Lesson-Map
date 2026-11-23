import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { sessionUserId, launchError } from "@/lib/launch-access";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { isSameOriginRequest } from "@/lib/payments/request-security";
import { courseOfferSchema } from "@/lib/course-offer";
import { revalidateTag } from "next/cache";
import { userCoursesTag } from "@/lib/course-cache";

type Context = { params: Promise<{ courseId: string }> };
async function access(courseId: string) {
  const userId = await sessionUserId();
  if (!userId)
    return {
      error: NextResponse.json({ error: "Please sign in." }, { status: 401 }),
    };
  const course = await db.course.findFirst({
    where: { id: courseId, userId },
    include: { user: true },
  });
  if (!course)
    return {
      error: NextResponse.json({ error: "Course not found." }, { status: 404 }),
    };
  if (effectiveAiPlan(course.user) === "FREE")
    return {
      error: NextResponse.json(
        { error: "Creator or Professional is required." },
        { status: 403 },
      ),
    };
  return { course, userId };
}
export async function GET(_request: Request, { params }: Context) {
  try {
    const result = await access((await params).courseId);
    if (result.error) return result.error;
    return NextResponse.json(courseOfferSchema.parse(result.course), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return launchError(error);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    if (!isSameOriginRequest(request))
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    const result = await access((await params).courseId);
    if (result.error) return result.error;
    const parsed = courseOfferSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    await db.course.update({
      where: { id: result.course.id },
      data: parsed.data,
    });
    revalidateTag(userCoursesTag(result.userId), { expire: 0 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return launchError(error);
  }
}

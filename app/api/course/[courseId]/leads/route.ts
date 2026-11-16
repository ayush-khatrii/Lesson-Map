import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { sessionUserId, launchError } from "@/lib/launch-access";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { isSameOriginRequest } from "@/lib/payments/request-security";
import { csvCell } from "@/lib/csv";

type Context = { params: Promise<{ courseId: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const userId = await sessionUserId();
    if (!userId)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { courseId } = await params;
    const course = await db.course.findFirst({
      where: { id: courseId, userId },
    });
    if (!course)
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    const leads = await db.lead.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      select: { email: true, createdAt: true },
    });
    if (new URL(request.url).searchParams.get("format") === "csv") {
      const csv =
        "Email,Signed up at\r\n" +
        leads
          .map(
            (lead) =>
              `${csvCell(lead.email)},${csvCell(lead.createdAt.toISOString())}`,
          )
          .join("\r\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="leads.csv"',
          "Cache-Control": "private, no-store",
        },
      });
    }
    return NextResponse.json(
      { enabled: course.emailCapture, leads },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return launchError(error);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    if (!isSameOriginRequest(request))
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    const userId = await sessionUserId();
    if (!userId)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { courseId } = await params;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || effectiveAiPlan(user) === "FREE")
      return NextResponse.json(
        { error: "Creator is required to enable email capture." },
        { status: 403 },
      );
    const body = await request.json().catch(() => null);
    if (typeof body?.enabled !== "boolean")
      return NextResponse.json({ error: "Invalid setting." }, { status: 400 });
    const result = await db.course.updateMany({
      where: { id: courseId, userId },
      data: { emailCapture: body.enabled },
    });
    if (!result.count)
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return launchError(error);
  }
}

import { auth } from "@/lib/auth";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;

  if (!userId) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      subscriptionStatus: true,
      subscriptionCancelAtPeriodEnd: true,
      subscriptionCurrentPeriodEnd: true,
    },
  });

  if (!user || effectiveAiPlan(user) === "FREE") {
    return NextResponse.json(
      { error: "Markdown export is available on a paid plan." },
      { status: 403 },
    );
  }

  const { courseId } = await params;
  const course = await db.course.findFirst({
    where: { id: courseId, userId },
    include: {
      Module: {
        orderBy: { order: "asc" },
        include: { Lesson: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const lines = [`# ${course.courseName}`, "", course.description, ""];
  for (const [moduleIndex, module] of course.Module.entries()) {
    lines.push(`## ${moduleIndex + 1}. ${module.moduleName}`, "");
    if (module.description) lines.push(module.description, "");
    for (const [lessonIndex, lesson] of module.Lesson.entries()) {
      lines.push(
        `### ${moduleIndex + 1}.${lessonIndex + 1} ${lesson.lessonName}`,
        "",
      );
    }
  }

  const filename = course.courseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "course";

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.md"`,
    },
  });
}

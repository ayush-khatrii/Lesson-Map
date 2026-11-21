import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { allowRequest, launchError } from "@/lib/launch-access";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { createHash } from "node:crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const body = z
      .object({
        email: z.string().trim().toLowerCase().email().max(254),
        consent: z.literal(true),
        website: z.string().max(0),
      })
      .safeParse(await request.json().catch(() => null));
    if (!body.success)
      return NextResponse.json(
        {
          error: "Enter a valid email and agree to share it with the creator.",
        },
        { status: 400 },
      );
    const { slug } = await params;
    const course = await db.course.findFirst({
      where: { shareSlug: slug, isPublic: true, emailCapture: true },
      include: { user: true },
    });
    if (!course || effectiveAiPlan(course.user) === "FREE")
      return NextResponse.json(
        { error: "Email signup is unavailable." },
        { status: 404 },
      );
    // Vercel supplies this IP header. Do not trust caller-controlled forwarding
    // headers on other hosts; missing IPs share a conservative fallback bucket.
    const ip = process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
      : undefined;
    const visitor = createHash("sha256").update(ip || "unknown").digest("hex");
    // Check the visitor first so blocked retries do not consume the course limit.
    if (
      !(await allowRequest(`lead-visitor:${course.id}:${visitor}`, 5)) ||
      !(await allowRequest(`lead:${course.id}`, 100))
    )
      return NextResponse.json(
        { error: "Please try again in a minute." },
        { status: 429 },
      );
    await db.lead.upsert({
      where: {
        courseId_email: { courseId: course.id, email: body.data.email },
      },
      create: { courseId: course.id, email: body.data.email },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return launchError(error);
  }
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_COLORS } from "@/constants/brand";
import { db } from "@/lib/prisma";
import { summarizeForMetadata } from "@/lib/site";
import { ImageResponse } from "next/og";

export const alt = "LessonMap course outline";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CourseOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await db.course.findFirst({
    where: { shareSlug: slug, isPublic: true },
    select: {
      courseName: true,
      description: true,
      user: {
        select: {
          name: true,
          plan: true,
          subscriptionStatus: true,
          subscriptionCancelAtPeriodEnd: true,
          subscriptionCurrentPeriodEnd: true,
        },
      },
      Module: { select: { _count: { select: { Lesson: true } } } },
    },
  });

  const logo = await readFile(join(process.cwd(), "public/logo-2.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  const title = course?.courseName ?? "Course outline";
  const creator = course?.user.name ?? "LessonMap creator";
  const moduleCount = course?.Module.length ?? 0;
  const lessonCount =
    course?.Module.reduce((total, module) => total + module._count.Lesson, 0) ??
    0;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        color: "white",
        background: `radial-gradient(circle at 88% 12%, ${BRAND_COLORS.primary} 0, transparent 35%), linear-gradient(135deg, #171717 0%, #292524 100%)`,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        <img
          src={logoSrc}
          alt=""
          width={56}
          height={56}
          style={{ borderRadius: 14 }}
        />
        LessonMap
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: 980,
        }}
      >
        <div
          style={{
            fontSize: 61,
            lineHeight: 1.08,
            fontWeight: 760,
            letterSpacing: "-2px",
          }}
        >
          {summarizeForMetadata(title, 90)}
        </div>
        {course?.description ? (
          <div style={{ fontSize: 25, lineHeight: 1.35, color: "#e5e5e5" }}>
            {summarizeForMetadata(course.description, 150)}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            gap: "24px",
            fontSize: 22,
            color: "#d4d4d4",
          }}
        >
          <span>By {creator}</span>
          <span>•</span>
          <span>{moduleCount} modules</span>
          <span>•</span>
          <span>{lessonCount} lessons</span>
        </div>
      </div>
    </div>,
    size,
  );
}

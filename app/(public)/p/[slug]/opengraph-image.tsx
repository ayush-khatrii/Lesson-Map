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
      user: { select: { name: true } },
      Module: { select: { _count: { select: { Lesson: true } } } },
    },
  });

  const title = course?.courseName ?? "Course outline";
  const creator = course?.user.name ?? "LessonMap creator";
  const moduleCount = course?.Module.length ?? 0;
  const lessonCount =
    course?.Module.reduce((total, module) => total + module._count.Lesson, 0) ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "white",
          background:
            "radial-gradient(circle at 88% 12%, #6475ff 0, transparent 35%), linear-gradient(135deg, #080b14 0%, #12182d 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: 28, fontWeight: 700 }}>
          <div style={{ display: "flex", width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", background: "#6475ff" }}>L</div>
          LessonMap
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: 980 }}>
          <div style={{ fontSize: 61, lineHeight: 1.08, fontWeight: 760, letterSpacing: "-2px" }}>
            {summarizeForMetadata(title, 90)}
          </div>
          {course?.description ? (
            <div style={{ fontSize: 25, lineHeight: 1.35, color: "#c8cde2" }}>
              {summarizeForMetadata(course.description, 150)}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: "24px", fontSize: 22, color: "#aeb6d7" }}>
            <span>By {creator}</span>
            <span>•</span>
            <span>{moduleCount} modules</span>
            <span>•</span>
            <span>{lessonCount} lessons</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

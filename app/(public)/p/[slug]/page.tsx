import { db } from "@/lib/prisma";
import LessonMapPublicPage from "@/components/CoursePreview";
import type { Course } from "@/components/CoursePreview";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { effectiveAiPlan } from "@/lib/ai/schema";

export default async function CoursePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Public courses are resolved by their stable share slug. The course ID is
  // also accepted for an authenticated owner so the dashboard can use this
  // same page as a preview before the course is made public.
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.session.userId;

  const course = await db.course.findFirst({
    where: {
      OR: [
        { shareSlug: slug, isPublic: true },
        ...(userId ? [{ id: slug, userId }] : []),
      ],
    },
    include: {
      user: {
        select: {
          name: true,
          image: true,
          plan: true,
          subscriptionStatus: true,
          subscriptionCancelAtPeriodEnd: true,
          subscriptionCurrentPeriodEnd: true,
        },
      },
      Module: {
        orderBy: { order: "asc" },
        include: {
          Lesson: {
            orderBy: { order: "asc" },
            include: {
              resources: true,
            },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const totalLessons = course.Module.reduce(
    (acc, m) => acc + m.Lesson.length,
    0,
  );

  const previewCourse: Course = {
    hideBranding: effectiveAiPlan(course.user) !== "FREE",
    id: course.shareSlug ?? course.id,
    title: course.courseName,
    description: course.description,
    audience: course.audience,
    creator: {
      name: course.user.name,
      avatar: course.user.image,
    },
    stats: {
      modules: course.Module.length,
      lessons: totalLessons,
    },
    modules: course.Module.map((mod, idx) => ({
      id: mod.id,
      label: `Module ${idx + 1}`,
      title: mod.moduleName,
      description: mod.description,
      lessons: mod.Lesson.map((lesson) => ({
        id: lesson.id,
        title: lesson.lessonName,
        done: false,
        resources: lesson.resources.map((r) => ({
          id: r.id,
          title: r.name,
          type: r.type,
          meta: r.meta,
          url: r.type === "PDF" || r.type === "Image"
            ? `/api/resource/${encodeURIComponent(r.id)}/open`
            : r.url ?? undefined,
          content: r.content,
        })),
      })),
    })),
  };

  return (
    <LessonMapPublicPage course={previewCourse} slug={slug} />
  );
}

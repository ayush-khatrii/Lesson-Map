import { db } from "@/lib/prisma";
import LessonMapPublicPage from "@/components/CoursePreview";
import type { Course, SocialLink } from "@/components/CoursePreview";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { effectiveAiPlan } from "@/lib/ai/schema";
import type { Metadata } from "next";
import {
  absoluteUrl,
  jsonLd,
  SITE_NAME,
  summarizeForMetadata,
} from "@/lib/site";

type CoursePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string | string[] }>;
};

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await db.course.findFirst({
    where: { shareSlug: slug, isPublic: true },
    select: {
      courseName: true,
      description: true,
      shareSlug: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true } },
    },
  });

  if (!course?.shareSlug) {
    return {
      title: "Course Preview",
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = `/p/${encodeURIComponent(course.shareSlug)}`;
  const description = summarizeForMetadata(course.description);
  const title = `${course.courseName} — Course Outline`;

  return {
    title,
    description,
    authors: [{ name: course.user.name }],
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      publishedTime: course.createdAt.toISOString(),
      modifiedTime: course.updatedAt.toISOString(),
      authors: [course.user.name],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CoursePreviewPage({ params, searchParams }: CoursePageProps) {
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
          socialInstagram: true,
          socialLinkedin: true,
          socialYoutube: true,
          socialGithub: true,
          socialTwitter: true,
          socialWebsite: true,
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

  // The creator configures these once in settings; each course decides whether
  // to show them. Empty entries are dropped so no blank buttons render.
  const socials: SocialLink[] = [];
  if (course.showSocialLinks) {
    const candidates: SocialLink[] = [
      {
        key: "instagram",
        label: "Instagram",
        url: course.user.socialInstagram ?? "",
      },
      {
        key: "linkedin",
        label: "LinkedIn",
        url: course.user.socialLinkedin ?? "",
      },
      {
        key: "youtube",
        label: "YouTube",
        url: course.user.socialYoutube ?? "",
      },
      { key: "github", label: "GitHub", url: course.user.socialGithub ?? "" },
      { key: "twitter", label: "X", url: course.user.socialTwitter ?? "" },
      {
        key: "website",
        label: "Website",
        url: course.user.socialWebsite ?? "",
      },
    ];
    socials.push(...candidates.filter((candidate) => candidate.url.length > 0));
  }

  const previewCourse: Course = {
    hideBranding: effectiveAiPlan(course.user) !== "FREE",
    id: course.shareSlug ?? course.id,
    title: course.courseName,
    description: course.description,
    audience: course.audience,
    creator: {
      name: course.user.name,
      avatar: course.user.image,
      socials,
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
        description: lesson.description,
        done: false,
        resources: lesson.resources.map((r) => ({
          id: r.id,
          title: r.name,
          type: r.type,
          meta: r.meta,
          url:
            ["PDF", "Image", "Document", "Spreadsheet"].includes(r.type)
              ? `/api/resource/${encodeURIComponent(r.id)}/open`
              : (r.url ?? undefined),
          content: r.content,
        })),
      })),
    })),
  };

  const requestedLesson = (await searchParams).lesson;
  const initialLessonId =
    typeof requestedLesson === "string" &&
    course.Module.some((mod) =>
      mod.Lesson.some((lesson) => lesson.id === requestedLesson),
    )
      ? requestedLesson
      : undefined;

  const isIndexablePublicCourse =
    course.isPublic && Boolean(course.shareSlug) && course.shareSlug === slug;
  const publicCourseUrl = isIndexablePublicCourse
    ? absoluteUrl(`/p/${encodeURIComponent(course.shareSlug!)}`)
    : null;
  const structuredData = publicCourseUrl
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Course",
            "@id": `${publicCourseUrl}#course`,
            name: course.courseName,
            description: summarizeForMetadata(course.description, 500),
            url: publicCourseUrl,
            provider: {
              "@type": "Organization",
              name: SITE_NAME,
              url: absoluteUrl(),
            },
            author: {
              "@type": "Person",
              name: course.user.name,
            },
            numberOfLessons: totalLessons,
            hasPart: course.Module.map((module, index) => ({
              "@type": "CreativeWork",
              position: index + 1,
              name: module.moduleName,
              description: summarizeForMetadata(module.description, 300),
            })),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: SITE_NAME,
                item: absoluteUrl(),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: course.courseName,
                item: publicCourseUrl,
              },
            ],
          },
        ],
      }
    : null;

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
        />
      ) : null}
      <LessonMapPublicPage
        course={previewCourse}
        slug={slug}
        canUseFlow={effectiveAiPlan(course.user) !== "FREE"}
        isOwner={userId === course.userId}
        initialLessonId={initialLessonId}
      />
    </>
  );
}

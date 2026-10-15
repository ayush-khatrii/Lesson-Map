import type { MetadataRoute } from "next";
import { db } from "@/lib/prisma";
import { absoluteUrl, PUBLIC_SITEMAP_TAG } from "@/lib/site";
import { cacheLife, cacheTag } from "next/cache";

const staticPages = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/examples", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/refund", priority: 0.3, changeFrequency: "yearly" as const },
];

async function getPublicCourses() {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 3600, expire: 86400 });
  cacheTag(PUBLIC_SITEMAP_TAG);

  return db.course.findMany({
    where: { isPublic: true, shareSlug: { not: null } },
    select: { shareSlug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // Static builds may intentionally run without database credentials. The
  // deployed sitemap uses the production DATABASE_URL and adds public courses.
  if (!process.env.DATABASE_URL?.trim()) return pages;

  try {
    const courses = await getPublicCourses();

    pages.push(
      ...courses.flatMap((course) =>
        course.shareSlug
          ? [{
              url: absoluteUrl(`/p/${encodeURIComponent(course.shareSlug)}`),
              lastModified: course.updatedAt,
              changeFrequency: "weekly" as const,
              priority: 0.7,
            }]
          : [],
      ),
    );
  } catch (error) {
    console.error("Could not include public courses in sitemap", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return pages;
}

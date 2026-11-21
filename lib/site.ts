export const CANONICAL_SITE_URL = "https://lessonmap.org";
const LEGACY_HOST = "lessonmap.vercel.app";

function resolveSiteUrl() {
  const candidate = process.env.NEXT_PUBLIC_BASE_URL?.trim() || CANONICAL_SITE_URL;

  try {
    const url = new URL(candidate);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
      return CANONICAL_SITE_URL;
    }
    // Older deployment settings must not publish the retired domain in SEO URLs.
    if (url.hostname === LEGACY_HOST || url.hostname === "www.lessonmap.org") return CANONICAL_SITE_URL;
    return url.origin;
  } catch {
    return CANONICAL_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "LessonMap";

export const SITE_TITLE = "LessonMap — Plan and Share Your Courses";

export const SITE_DESCRIPTION =
  "Create course outlines with AI, organize modules and lessons, add learning resources, and share clear, visual learning paths with LessonMap.";

export const PUBLIC_SITEMAP_TAG = "public-course-sitemap";

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function summarizeForMetadata(value: string, maxLength = 160) {
  const summary = value.replace(/\s+/g, " ").trim();
  if (summary.length <= maxLength) return summary;
  return `${summary.slice(0, maxLength - 1).trimEnd()}…`;
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

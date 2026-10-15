const FALLBACK_SITE_URL = "https://lessonmap.vercel.app";

function resolveSiteUrl() {
  const candidate = process.env.NEXT_PUBLIC_BASE_URL?.trim() || FALLBACK_SITE_URL;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return FALLBACK_SITE_URL;
    }
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "LessonMap";

export const SITE_DESCRIPTION =
  "Plan courses visually, organize modules and lessons, attach learning resources, and share a clear course outline with one link.";

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

import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

const title = "Course Outline Templates for Educators";
const description =
  "Browse course outline templates with organized modules and lessons. Preview a template, make it your own, and share your course with LessonMap.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/examples" },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: "/examples",
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [{ url: "/opengraph-image", alt: SITE_NAME }],
  },
};

export default function ExamplesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import LandingPage from "@/components/marketing/LandingPage";
import { absoluteUrl, jsonLd, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "LessonMap — Build and Share Online Courses",
  description: "Plan modules and lessons, add notes and learning resources, and share your course with one link. Learners can follow the course without creating an account.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "LessonMap — Build and Share Online Courses",
    description: SITE_DESCRIPTION,
    url: "/",
  },
};

export default function Page() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${absoluteUrl()}#organization`,
        name: SITE_NAME,
        url: absoluteUrl(),
      },
      {
        "@type": "WebSite",
        "@id": `${absoluteUrl()}#website`,
        name: SITE_NAME,
        url: absoluteUrl(),
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${absoluteUrl()}#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        url: absoluteUrl(),
        description: SITE_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free plan available",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <LandingPage />
    </>
  );
}

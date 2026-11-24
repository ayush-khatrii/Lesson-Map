import type { Metadata } from "next";
import LandingPage from "@/components/marketing/LandingPage";
import { SUPPORT_EMAIL } from "@/constants/email";
import { PLAN_PRICING } from "@/constants/pricing";
import { absoluteUrl, jsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/opengraph-image", alt: SITE_TITLE }],
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
        logo: absoluteUrl("/logo-2.png"),
        email: SUPPORT_EMAIL,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: SUPPORT_EMAIL,
        },
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
          price: PLAN_PRICING.plans.FREE.amount,
          priceCurrency: PLAN_PRICING.currency,
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

import type { Metadata } from "next";
import { PLAN_PRICING } from "@/constants/pricing";
import { absoluteUrl, jsonLd, SITE_NAME } from "@/lib/site";

const title = "LessonMap Pricing | Free and Creator Plans";
const description =
  "Compare LessonMap's Free and Creator plans. Build and share courses for free, or upgrade for more AI outlines, exports, email capture, and unbranded sharing.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title,
    description,
    url: "/pricing",
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: "/opengraph-image", alt: SITE_NAME }],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LessonMap",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/pricing"),
    offers: Object.values(PLAN_PRICING.plans).map((plan) => ({
      "@type": "Offer",
      name: `${plan.name} Plan`,
      price: plan.amount,
      priceCurrency: PLAN_PRICING.currency,
      url: absoluteUrl("/pricing"),
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: plan.amount,
        priceCurrency: PLAN_PRICING.currency,
        unitText: PLAN_PRICING.billingPeriod.toUpperCase(),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      {children}
    </>
  );
}

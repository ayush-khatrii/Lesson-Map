import type { Metadata } from "next";
import { absoluteUrl, jsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing — Course Planning Plans for Creators",
  description:
    "Compare LessonMap plans for creating, organizing, exporting, and sharing course outlines. Start free and upgrade when you need more AI generations and creator features.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "LessonMap Pricing",
    description: "Choose a LessonMap plan for planning and sharing structured online courses.",
    url: "/pricing",
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
    offers: [
      {
        "@type": "Offer",
        name: "Free Plan",
        price: "0",
        priceCurrency: "USD",
        url: absoluteUrl("/pricing"),
      },
      {
        "@type": "Offer",
        name: "Creator Plan",
        price: "12",
        priceCurrency: "USD",
        url: absoluteUrl("/pricing"),
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "12",
          priceCurrency: "USD",
          unitText: "MONTH",
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
      {children}
    </>
  );
}

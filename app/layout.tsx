import type { Metadata } from "next";
// @ts-ignore
import "@/app/globals.css";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const alanSans = localFont({
  src: "../node_modules/@fontsource-variable/alan-sans/files/alan-sans-latin-wght-normal.woff2",
  weight: "300 900",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,

  title: {
    default: "LessonMap — Visual Course & Lesson Planner",
    template: "%s | LessonMap",
  },

  description: SITE_DESCRIPTION,
  category: "education",
  creator: "LessonMap",
  publisher: "LessonMap",
  verification: {
    google: "TvoYaGo4ad-6OCsLB9Xxh8tk0-idp16IjRR_RFv3-qc",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  openGraph: {
    title: "LessonMap — Visual Course & Lesson Planner",
    description:
      "Build and organize courses with a beautiful visual lesson mapping workspace.",
    url: SITE_URL,
    siteName: "LessonMap",
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "LessonMap — Visual course planning for creators" }],
  },

  twitter: {
    card: "summary_large_image",
    images: [{ url: "/opengraph-image", alt: "LessonMap — Visual course planning for creators" }],
    title: "LessonMap — Visual Course & Lesson Planner",
    description:
      "Organize lessons, modules, and learning paths visually with LessonMap.",
  },
};

export default function MainRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={alanSans.className}>
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}

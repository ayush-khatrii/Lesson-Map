import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
// @ts-ignore
import "@/app/globals.css";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

const alanSans = localFont({
  src: "./fonts/alan-sans-latin-wght-normal.woff2",
  weight: "300 900",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,

  title: {
    default: SITE_TITLE,
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "LessonMap",
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_TITLE }],
  },

  twitter: {
    card: "summary_large_image",
    images: [{ url: "/opengraph-image", alt: SITE_TITLE }],
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
        <Analytics />
      </body>
    </html>
  );
}

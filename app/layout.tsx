import type { Metadata } from "next";
// @ts-ignore
import "@/app/globals.css";
import { Alan_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const alanSans = Alan_Sans({ subsets: ["latin"] });
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
  },

  twitter: {
    card: "summary_large_image",
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

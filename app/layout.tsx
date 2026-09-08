import type { Metadata } from "next";
// @ts-ignore
import "@/app/globals.css";
import { Alan_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";

const alanSans = Alan_Sans({ subsets: ["latin"] });
export const metadata: Metadata = {
  metadataBase: new URL("https://lessonmap.vercel.app"),

  title: {
    default: "LessonMap — Visual Course & Lesson Planner",
    template: "%s | LessonMap",
  },

  description:
    "Plan courses visually with LessonMap. Organize modules, lessons, and learning paths using a clean mind-map inspired workspace designed for educators, creators, and teams.",

  keywords: [
    "LessonMap",
    "course planner",
    "lesson planner",
    "course outline builder",
    "curriculum planner",
    "learning roadmap",
    "visual lesson planner",
    "mind map for courses",
    "course organization tool",
    "lesson management",
    "educational planning software",
  ],

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "LessonMap — Visual Course & Lesson Planner",
    description:
      "Build and organize courses with a beautiful visual lesson mapping workspace.",
    url: "https://lessonmap.vercel.app",
    siteName: "LessonMap",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LessonMap",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "LessonMap — Visual Course & Lesson Planner",
    description:
      "Organize lessons, modules, and learning paths visually with LessonMap.",
    images: ["/logo.png"],
  },

  robots: {
    index: true,
    follow: true,
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

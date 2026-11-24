import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Github } from "lucide-react";
import Reveal from "@/components/marketing/Reveal";
import { SITE_NAME } from "@/lib/site";

const title = "About LessonMap | Course Planning and Sharing";
const description =
  "Meet LessonMap, an online course builder for educators and creators. Organize lessons and learning materials, then share your course with a link.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/about" },
  openGraph: {
    title,
    description,
    url: "/about",
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

export default function AboutPage() {
  return (
    <div className="pt-16">
      <div className="mx-auto w-full max-w-2xl px-6 py-8 sm:py-10">
        <Reveal>
          <h1 className="text-2xl font-medium tracking-tight text-primary-text sm:text-3xl">About LessonMap</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">A simple workspace to organize modules and lessons, attach learning resources, and share your course with a link.</p>
        </Reveal>
        <Reveal className="mt-6 rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border font-mono text-sm text-primary-text" aria-hidden="true">ak.</div>
            <div>
              <p className="text-xs text-muted-foreground">Built by</p>
              <h2 className="text-lg font-medium tracking-tight text-primary-text">Ayush Khatri</h2>
            </div>
          </div>
          <div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Find my work on my portfolio and GitHub.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="https://ayushkhatri.in" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-3 rounded-lg border border-border px-4 text-sm hover:bg-muted/30">ayushkhatri.in <ArrowUpRight aria-hidden="true" className="size-4" /></a>
              <a href="https://github.com/ayush-khatrii" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-3 rounded-lg border border-border px-4 text-sm hover:bg-muted/30"><Github aria-hidden="true" className="size-4" /> GitHub <ArrowUpRight aria-hidden="true" className="size-4" /></a>
            </div>
          </div>
        </Reveal>
        <nav aria-label="About page links" className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link href="/examples" className="inline-flex min-h-11 items-center gap-2 font-medium hover:underline">Explore LessonMap <ArrowRight aria-hidden="true" className="size-4" /></Link>
          <a href="https://github.com/ayush-khatrii/Lesson-Map" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-muted-foreground hover:text-foreground">Project on GitHub <ArrowUpRight aria-hidden="true" className="size-3.5" /></a>
        </nav>
      </div>
    </div>
  );
}

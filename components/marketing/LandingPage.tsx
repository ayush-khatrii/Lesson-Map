"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  FileText,
  GripVertical,
  Layers2,
  Link2,
  Paperclip,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import Reveal from "./Reveal";
import MarketingFooter from "./MarketingFooter";

const modules = [
  {
    title: "Start with the web",
    lessons: [
      "How the web works",
      "Your first HTML page",
      "Links, images & structure",
    ],
  },
  {
    title: "Make it your own",
    lessons: [
      "The basics of CSS",
      "Layout with flexbox",
      "Design for smaller screens",
    ],
  },
  {
    title: "Build something real",
    lessons: [
      "Plan a personal website",
      "Put the pieces together",
      "Publish your first site",
    ],
  },
];

const features = [
  {
    icon: Layers2,
    number: "01",
    title: "Find the right order.",
    description:
      "Break your course into modules and lessons. Add descriptions and drag things into place as your outline takes shape.",
  },
  {
    icon: Paperclip,
    number: "02",
    title: "Keep the material close.",
    description:
      "Attach notes, links, code, PDFs, and images to individual lessons. Give every resource a place in the course.",
  },
  {
    icon: Link2,
    number: "03",
    title: "Give learners a link.",
    description:
      "Publish a course page people can open without an account. Learners can browse resources and track completion in their browser.",
  },
];

const primaryLink =
  "inline-flex min-h-11 items-center justify-center gap-3 rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

function FeatureVisual({ feature }: { feature: string }) {
  const labels: Record<string, string> = {
    "01": "Example course outline with a module and two ordered lessons",
    "02": "Example lesson resources: notes, code, and a reference link",
    "03": "Example shared course with one of three lessons complete",
  };

  return (
    <div
      role="img"
      aria-label={labels[feature]}
      className="mb-6 flex min-h-52 w-full items-center rounded-xl border border-border bg-transparent p-5 text-left"
    >
      <div aria-hidden="true" className="w-full">
        {feature === "01" && (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 px-3 py-3">
              <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
              <Layers2 className="size-4 shrink-0 text-primary" />
              <span className="text-xs font-medium">Start with the web</span>
            </div>
            <div className="ml-5 mt-3 space-y-3 border-l border-primary/30 pl-4">
              {["How the web works", "Your first HTML page"].map(
                (lesson, index) => (
                  <div
                    key={lesson}
                    className="flex items-center gap-2 py-1 text-xs text-muted-foreground"
                  >
                    <span className="font-mono text-[10px]">1.{index + 1}</span>
                    {lesson}
                  </div>
                ),
              )}
            </div>
          </>
        )}
        {feature === "02" && (
          <>
            <p className="mb-3 text-xs font-medium text-primary">
              Your first HTML page
            </p>
            <div className="space-y-2">
              {[
                { icon: FileText, name: "Lesson notes", type: "Note" },
                { icon: Code2, name: "index.html", type: "Code" },
                { icon: Link2, name: "HTML reference", type: "Link" },
              ].map(({ icon: Icon, name, type }) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"
                >
                  <Icon className="size-3.5 shrink-0 text-primary" />
                  <span className="flex-1">{name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {type}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {feature === "03" && (
          <>
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-xs text-muted-foreground">
              <Link2 className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">
                lessonmap.vercel.app/p/your-course
              </span>
            </div>
            <p className="text-sm font-medium text-primary">
              Your first website
            </p>
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Your progress</span>
              <span>1 of 3 lessons</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 rounded-full bg-primary" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex size-4 items-center justify-center rounded-full border border-primary text-primary">
                <Check className="size-2.5" />
              </span>
              How the web works
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CourseSample() {
  const [openModule, setOpenModule] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-transparent">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-7">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Layers2 className="size-4" aria-hidden="true" /> Course outline
        </span>
        <span className="text-xs text-muted-foreground">Sample course</span>
      </div>
      <div className="px-5 pb-6 pt-7 sm:px-7">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
          Web development
        </p>
        <h2 className="text-2xl font-medium tracking-tight">
          Your first website
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          From a blank page to something you can share.
        </p>
        <div className="mt-5 flex gap-4 text-xs text-muted-foreground">
          <span>3 modules</span>
          <span>9 lessons</span>
        </div>
        <div className="mt-6 divide-y divide-border border-y border-border">
          {modules.map((module, index) => {
            const isOpen = openModule === index;
            return (
              <div key={module.title}>
                <button
                  type="button"
                  onClick={() => setOpenModule(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`sample-module-${index}`}
                  className="flex min-h-16 w-full items-center gap-3 rounded-sm py-4 text-left focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <GripVertical
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground/60"
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    0{index + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">
                    {module.title}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.18 }}
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                  </motion.span>
                </button>
                <div id={`sample-module-${index}`} hidden={!isOpen}>
                  <motion.ol
                    initial={false}
                    animate={{ opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    className="mb-5 ml-5 space-y-4 border-l border-border pl-5 sm:ml-7"
                  >
                    {module.lessons.map((lesson, lessonIndex) => (
                      <li
                        key={lesson}
                        className="flex items-center gap-3 text-sm text-muted-foreground"
                      >
                        <span className="font-mono text-[10px]">
                          {index + 1}.{lessonIndex + 1}
                        </span>
                        <span className="flex-1">{lesson}</span>
                        {lessonIndex === 0 && (
                          <FileText
                            aria-label="Lesson resource"
                            className="size-3.5 shrink-0"
                          />
                        )}
                      </li>
                    ))}
                  </motion.ol>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Click a module to explore its lessons.
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { data: session, isPending } = useSession();
  const createHref = session?.user ? "/dashboard/create/new" : "/sign-in";
  return (
    <div className="0">
      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-28">
        <Reveal>
          <h1 className="mt-7 w-full text-5xl font-medium leading-[1.06] tracking-[-0.055em] sm:text-6xl lg:text-[4.25rem]">
            What you know.
            <br />A clear path
            <br />
            <span className="text-primary">to teach it.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
            Turn your knowledge into an organized course. Bring lessons and
            resources together, then share it with a link.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            {isPending ? (
              <div role="status" className="flex flex-wrap items-center gap-5">
                <span className="sr-only">Loading account actions</span>
                <span
                  aria-hidden="true"
                  className="h-11 w-44 rounded-lg bg-muted"
                />
                <span
                  aria-hidden="true"
                  className="h-11 w-36 rounded-lg bg-muted"
                />
              </div>
            ) : session?.user ? (
              <Link href="/dashboard" className={primaryLink}>
                Go to dashboard
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className={primaryLink}>
                  Create a course
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/examples"
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  Explore examples
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </Link>
              </>
            )}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <CourseSample />
        </Reveal>
      </section>

      <section
        id="features"
        className="mx-auto w-full max-w-6xl scroll-mt-24 border-t border-border px-6 py-16 sm:py-20 lg:px-8"
      >
        <Reveal className="flex flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-3xl font-medium tracking-[-0.035em] text-primary sm:text-4xl">
            A little structure.
          </h2>

          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            A course that makes sense.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {features.map(({ icon: Icon, number, title, description }, index) => (
            <Reveal
              key={number}
              delay={index * 0.06}
              className="flex flex-col items-center text-center"
            >
              <FeatureVisual feature={number} />
              <div className="mb-4 flex items-center justify-center gap-2">
                <Icon aria-hidden="true" className="size-4 text-primary" />
                <span className="font-mono text-xs text-muted-foreground">
                  {number}
                </span>
              </div>
              <h3 className="text-lg font-medium tracking-tight text-primary">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {description}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 border-t border-border px-6 py-16 sm:py-20 lg:px-8">
        <Reveal className="flex flex-col items-center justify-center text-center">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Make a start
          </p>
          <h2 className="mt-4 text-3xl font-medium tracking-[-0.035em] text-primary sm:text-4xl">
            A blank page.
            <br />
            Or a head start.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
            Build your own outline from scratch, or adapt a Web Development or
            DSA template to what you want to teach.
          </p>
          <Link
            href="/examples"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Browse the templates{" "}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Reveal>
        <Reveal className="w-full max-w-2xl rounded-xl border border-border p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <h3 className="text-lg font-medium tracking-tight text-primary">
              From outline to shared course
            </h3>
            <ArrowDown
              className="mt-1 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <ol className="mt-7 space-y-6">
            {[
              "Give your course a title and description.",
              "Add modules, lessons, and useful resources.",
              "Enable sharing and send the link.",
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-4">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-sm leading-6 text-muted-foreground">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-7 flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
            <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />{" "}
            Public courses can be viewed without signing in.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-6xl border-t border-border px-6 py-16 sm:py-20 lg:px-8">
        <Reveal className="flex flex-col items-center justify-center gap-8 text-center">
          <div>
            <h2 className="text-3xl font-medium tracking-[-0.035em] text-primary sm:text-4xl">
              What will you teach?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Start with one lesson. Build from there.
            </p>
          </div>
          <Link href={createHref} className={primaryLink}>
            Create a course <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Reveal>
      </section>
      <MarketingFooter />
    </div>
  );
}

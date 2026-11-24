import Link from "next/link";
import { FaYoutube } from "react-icons/fa6";
import { RiLinksFill, RiShareForwardFill, RiStackFill } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { shell } from "./styles";

const steps = [
  {
    icon: RiLinksFill,
    title: "Paste the link",
    description: "Paste a public or unlisted playlist link.",
  },
  {
    icon: RiStackFill,
    title: "Import your videos",
    description: "Each available video becomes a lesson, in playlist order.",
  },
  {
    icon: RiShareForwardFill,
    title: "Edit and share",
    description: "Reorder, add notes, and publish one link.",
  },
];

const lessons = [
  "Foundations",
  "Components and props",
  "State and hooks",
  "Build a project",
];

export default function YouTubeImportShowcase() {
  return (
    <section
      id="youtube-import"
      aria-labelledby="youtube-import-heading"
      aria-describedby="youtube-import-description"
      className="scroll-mt-20 py-10 sm:py-12 lg:py-16"
    >
      <div
        className={`${shell} grid gap-y-7 sm:gap-y-10 lg:grid-cols-2 lg:gap-x-14 lg:gap-y-8`}
      >
        <header className="mx-auto max-w-2xl text-center lg:col-start-2 lg:row-start-1 lg:mx-0 lg:max-w-none lg:text-left">
          <p className="text-sm font-semibold text-primary-text">
            YouTube import
          </p>
          <h2
            id="youtube-import-heading"
            className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl"
          >
            Turn a YouTube playlist into a course
          </h2>
          <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground">
            Import available videos from a public or unlisted playlist with up to
            500 videos. Each becomes a lesson in playlist order, ready to edit and share.
          </p>
          <p id="youtube-import-description" className="sr-only">
            Example preview: a YouTube playlist becomes React for Beginners, an
            editable course with one module and four video lessons.
          </p>
        </header>

        <div
          aria-hidden="true"
          className="pointer-events-none min-w-0 w-full max-w-xl justify-self-center self-center rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm sm:p-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-w-none"
        >
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-input bg-background p-2 sm:gap-3">
            <FaYoutube
              className="size-6 shrink-0 text-[#FF0000]"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              youtube.com/playlist?list=PL...
            </span>
            <Button asChild size="sm" className="h-10 shrink-0 px-3">
              <span>Import</span>
            </Button>
          </div>

          <div className="mt-4 border-t border-border pt-5 sm:mt-6 sm:pt-6">
            <div className="flex items-start gap-3">
              <RiStackFill
                className="mt-1 size-5 shrink-0 text-primary-text"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight sm:text-xl">
                  React for Beginners
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  1 module, 4 lessons
                </p>
              </div>
            </div>
            <div className="mt-4 divide-y divide-border sm:mt-6">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson}
                  className="flex min-w-0 items-center gap-2 py-2 sm:gap-3 sm:py-3"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-medium tabular-nums text-muted-foreground sm:size-7">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium leading-5">
                    {lesson}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground sm:text-sm">
                    Video
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-lg lg:col-start-2 lg:row-start-2 lg:mx-0 lg:max-w-none">
          <ol className="space-y-4 sm:space-y-5">
            {steps.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-text">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-5 sm:text-base">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 sm:mt-8">
            <Button
              asChild
              size="lg"
              className="min-h-11 w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground sm:w-auto"
            >
              <Link href="/start" prefetch={false}>
                Start now
              </Link>
            </Button>
            <p className="mt-3 text-sm leading-5 text-muted-foreground">
              Free includes one playlist import per account. Creator includes
              unlimited imports, subject to rate limits and YouTube availability.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

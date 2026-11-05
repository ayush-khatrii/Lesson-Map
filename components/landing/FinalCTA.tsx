import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/marketing/Reveal";
import { shell } from "./styles";
import { Button } from "@/components/ui/button";

//iOS-style liquid glass effect.

export default function FinalCTA() {
  return (
    <section className={`${shell} pb-20 sm:pb-24`}>
      <div className="relative isolate ">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-primary/35 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-8 -z-10 h-64 w-72 rounded-full bg-sky-400/25 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-4 -z-10 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-[100px]"
        />

        <Reveal className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-black/60 shadow-xl shadow-black/10 backdrop-blur-2xl backdrop-saturate-150 sm:rounded-[2.5rem] dark:border-border dark:bg-black/5 dark:shadow-black/40">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/40"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-transparent dark:from-white/10"
          />

          <div className="relative px-6 py-14 text-center sm:px-12 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Start building
            </p>
            <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-6xl">
              Ready to build your course?
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
              Create the first lesson today. Add the rest when you are ready.
            </p>

            <div className="mt-9">
              <Button asChild size="lg" className="rounded-full">
                <Link href="/start">
                  Create a course
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

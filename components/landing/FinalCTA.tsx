"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import Reveal from "@/components/marketing/Reveal";
import { shell } from "./styles";

/**
 * iOS-style "liquid glass" panel.
 *
 * The effect only reads as glass if there is colour behind it to refract, so the
 * blurred orbs below are not decoration — they are what the backdrop-blur pulls
 * through. Remove them and the panel flattens into a plain translucent box.
 */
export default function FinalCTA() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const href = mounted && session?.user ? "/dashboard/create/new" : "/sign-in";

  return (
    <section className={`${shell} pb-20 sm:pb-24`}>
      <div className="relative isolate ">
        {/* Refracted colour. Kept behind the panel with -z-10 inside this
            stacking context so it never sits over the copy. */}
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

        <Reveal className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-white/60 shadow-xl shadow-black/10 backdrop-blur-2xl backdrop-saturate-150 sm:rounded-[2.5rem] dark:border-border dark:bg-white/5 dark:shadow-black/40">
          {/* Specular rim — brightest along the top edge, like light catching glass. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/40"
          />
          {/* Soft wash falling off from the top, giving the surface depth. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-transparent dark:from-white/10"
          />

          <div className="relative px-6 py-14 text-center sm:px-12 sm:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Start building</p>
            <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-6xl">
              Ready to build your course?
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
              Create the first lesson today. Add the rest when you are ready.
            </p>

            {/* Translucent tinted pill rather than a solid fill, so it sits on the
                glass instead of punching a hole through it. */}
            <Link
              href={href}
              className="group relative mt-9 inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full border border-white/40 bg-primary/85 px-7 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 backdrop-blur-xl backdrop-saturate-150 transition duration-200 hover:-translate-y-0.5 hover:bg-primary active:translate-y-0 dark:border-white/25"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/40 to-transparent"
              />
              <span className="relative">Create a course</span>
              <ArrowRight className="relative size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

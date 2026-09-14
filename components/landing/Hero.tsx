"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Play } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import CoursePreview from "./CoursePreview";
import { primaryCta, secondaryCta, shell } from "./styles";

export default function Hero() {
  const { data: session, isPending } = useSession();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shouldReduce = mounted && reduceMotion;
  const destination = session?.user ? "/dashboard" : "/sign-in";

  return (
    <section className="relative overflow-hidden pb-20 pt-28 sm:pb-24 sm:pt-32 lg:pt-36">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_20%,transparent),transparent_72%)]" />
      <div className={`${shell} grid items-center gap-14 lg:grid-cols-2 lg:gap-14`}>
        <motion.div initial={false} animate={shouldReduce ? undefined : { opacity: [0.72, 1], y: [12, 0] }} transition={{ duration: 0.6, ease: "easeOut" }}>
          {/* <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
            Visual course planning, all in one place
          </div> */}
          <h1 className="max-w-2xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-6xl">
            Turn your knowledge into a course people can follow.
          </h1>
          <p className="mt-7 max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Plan modules and lessons, keep every resource in one place, and share the finished course with a simple link.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {!mounted || isPending ? <div className="h-12 w-40 animate-pulse rounded-xl bg-muted" aria-label="Loading account action" /> : (
              <Link href={destination} className={primaryCta}>{session?.user ? "Go to dashboard" : "Create a course"}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
            )}
            <Link href="/examples" className={secondaryCta}><Play className="size-3.5 fill-current" aria-hidden="true" />Explore examples</Link>
          </div>
          {/* <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><span className="flex -space-x-1.5" aria-hidden="true">{["bg-amber-300", "bg-orange-300", "bg-yellow-200"].map((color) => <span key={color} className={`size-5 rounded-full border-2 border-background ${color}`} />)}</span>Build from scratch, use a template, or start with AI.</p> */}
        </motion.div>
        <CoursePreview />
      </div>
    </section>
  );
}

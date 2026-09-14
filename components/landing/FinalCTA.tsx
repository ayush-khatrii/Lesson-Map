"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import Reveal from "@/components/marketing/Reveal";
import { primaryCta, shell } from "./styles";

export default function FinalCTA() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <section className={`${shell} pb-20 sm:pb-24`}>
      <Reveal className="relative overflow-hidden rounded-3xl border border-border bg-foreground px-6 py-14 text-center text-background shadow-2xl sm:px-12 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,color-mix(in_oklab,var(--primary)_55%,transparent),transparent_45%)] opacity-70" />
        <div className="relative mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-background/60">Start building</p><h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">Ready to build your course?</h2><p className="mt-5 text-base text-background/65 sm:text-lg">Create the first lesson today. Add the rest when you are ready.</p><Link href={mounted && session?.user ? "/dashboard/create/new" : "/sign-in"} className={`${primaryCta} mt-8 !bg-primary !text-primary-foreground hover:!shadow-primary/20`}>Create a course<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link></div>
      </Reveal>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight, LayoutTemplate, Plus } from "lucide-react";
import Reveal from "@/components/marketing/Reveal";
import { Card } from "@/components/ui/card";
import { secondaryCta, shell } from "./styles";

export default function Templates() {
  return (
    <section className="border-y border-border/70 bg-muted/20 py-20 sm:py-24">
      <div className={`${shell} grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16`}>
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground dark:text-primary">
            Choose how to begin
          </p>
          <h2 className="mt-4 max-w-lg text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Start from scratch or use a template.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Create your own outline, or begin with a Web Development or DSA course and change it to fit your learners.
          </p>
          <Link href="/examples" className={`${secondaryCta} mt-7`}>
            Browse templates
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2">
          <Reveal>
            <Card className="h-full gap-0 rounded-2xl border-border/80 bg-background p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-muted"><Plus className="size-4" /></span>
              <h3 className="mt-6 text-base font-semibold">Blank course</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Add your own modules, lessons, and resources in any order.</p>
            </Card>
          </Reveal>
          <Reveal delay={0.06}>
            <Card className="h-full gap-0 rounded-2xl border-primary/35 bg-primary/10 p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><LayoutTemplate className="size-4" /></span>
              <h3 className="mt-6 text-base font-semibold">Course template</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Use a complete starting structure, then edit every part.</p>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

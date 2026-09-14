import { Code2, FileText, GripVertical, ImageIcon, Link2, Send, Sparkles } from "lucide-react";
import Reveal from "@/components/marketing/Reveal";
import { Card } from "@/components/ui/card";
import { shell } from "./styles";

const items = [
  {
    number: "01",
    title: "Plan the course.",
    description: "Break your topic into modules and lessons, then drag them into the right order.",
    visual: (
      <div className="space-y-2">
        {["Start with the web", "Make it your own", "Build something real"].map((label, index) => (
          <div key={label} className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-xs font-medium ${index === 1 ? "translate-x-2 border-primary/50 bg-primary/10 shadow-lg" : "border-border bg-background/70"}`}>
            <GripVertical className="size-3.5 text-muted-foreground" /><span className="font-mono text-[9px] text-muted-foreground">0{index + 1}</span>{label}
          </div>
        ))}
      </div>
    ),
  },
  {
    number: "02",
    title: "Add the learning material.",
    description: "Add notes, links, code, PDFs, and images directly to each lesson.",
    visual: (
      <div>
        <div className="mb-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>Your first HTML page</span><span>4 resources</span></div>
        <div className="grid grid-cols-2 gap-2">
          {[[FileText,"Notes"],[Code2,"Code"],[Link2,"Links"],[ImageIcon,"Images"]].map(([Icon,label]) => { const I = Icon as typeof FileText; return <div key={label as string} className="rounded-lg border border-border bg-background/70 p-3"><I className="size-4 text-primary" /><p className="mt-4 text-xs font-medium">{label as string}</p></div>; })}
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Share it with learners.",
    description: "Publish one link. Learners can open the course and track progress without an account.",
    visual: (
      <div className="rounded-xl border border-border bg-background/70 p-4">
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-[9px] text-muted-foreground"><Link2 className="size-3" />lessonmap.app/p/your-course</div>
        <div className="mt-4 flex items-center justify-between"><div><p className="text-xs font-semibold">Your first website</p><p className="mt-1 text-[10px] text-muted-foreground">Public · no sign-in needed</p></div><span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><Send className="size-4" /></span></div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 rounded-full bg-primary" /></div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border/70 bg-muted/20 py-20 sm:py-24">
      <div className={shell}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground dark:text-primary">How it works</p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Plan it. Add the material. <span className="text-muted-foreground">Share it.</span></h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {items.map((item, index) => (
            <Reveal key={item.number} delay={index * 0.07}>
              <Card className="group h-full overflow-hidden rounded-2xl border-border/80 bg-card/70 p-2 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                <div className="min-h-56 rounded-xl border border-border/60 bg-muted/30 p-5">{item.visual}</div>
                <div className="px-4 pb-5 pt-2"><div className="mb-4 flex items-center gap-2"><span className="font-mono text-[10px] text-muted-foreground">{item.number}</span><Sparkles className="size-3.5 text-primary" /></div><h3 className="text-lg font-semibold tracking-tight">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p></div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

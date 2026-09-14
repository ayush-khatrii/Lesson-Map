import {
  Bot,
  Braces,
  ChartNoAxesColumnIncreasing,
  FileStack,
  GripVertical,
  Link2,
} from "lucide-react";
import Reveal from "@/components/marketing/Reveal";
import { Card } from "@/components/ui/card";
import { shell } from "./styles";

const features = [
  {
    icon: GripVertical,
    title: "Drag-and-drop builder",
    description: "Move modules and lessons until the course flows naturally.",
  },
  { icon: Bot, title: "AI outlines and templates", description: "Start with AI, Web Development, or DSA, then edit every part." },
  {
    icon: Braces,
    title: "Rich lesson content",
    description: "Keep notes, code, links, PDFs, and images with each lesson.",
  },
  {
    icon: Link2,
    title: "Shareable course links",
    description: "Publish a course anyone can open, even without an account.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Learner progress",
    description: "Let learners track completion directly in their browser.",
  },
  {
    icon: FileStack,
    title: "Pro publishing controls",
    description: "Remove LessonMap branding and export your course as Markdown.",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-24">
      <div className={shell}>
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground dark:text-primary">
            Everything in one map
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Everything you need to build and share a course.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Six focused tools help you organize the course, add learning material, and publish it.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }, index) => (
            <Reveal
              key={title}
              delay={(index % 3) * 0.05}
            >
              <Card className="group h-full gap-0 rounded-2xl border-border/80 bg-card/60 p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                <span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary-foreground transition-transform duration-200 group-hover:scale-105 dark:text-primary">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-base font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

import { FilePlus2, ListTree, Send } from "lucide-react";
import Reveal from "@/components/marketing/Reveal";
import { shell } from "./styles";

const steps = [
  { icon: FilePlus2, title: "Name your course", description: "Add a clear title and tell learners what the course covers." },
  { icon: ListTree, title: "Build the lessons", description: "Add modules, lessons, notes, links, files, and code." },
  { icon: Send, title: "Publish and share", description: "Make the course public and send learners one simple link." },
];

export default function StepsToShare() {
  return (
    <section className="py-20 sm:py-24">
      <div className={shell}>
        <Reveal className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Three simple steps</p><h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Build your course, then share it.</h2></Reveal>
        <ol className="relative mx-auto mt-12 grid max-w-5xl gap-10 md:grid-cols-3 md:gap-6 before:absolute before:left-[16.67%] before:right-[16.67%] before:top-7 before:hidden before:border-t before:border-dashed before:border-border md:before:block">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} delay={index * 0.08} className="relative text-center">
              <span className="relative z-10 mx-auto grid size-14 place-items-center rounded-2xl border border-border bg-background shadow-md"><Icon className="size-5 text-primary" /></span>
              <span className="mt-5 block font-mono text-[10px] text-muted-foreground">STEP 0{index + 1}</span><h3 className="mt-2 text-base font-semibold">{title}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

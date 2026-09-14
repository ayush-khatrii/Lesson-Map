"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, FileText, GripVertical, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const modules = [
  { title: "Start with the web", lessons: ["How the web works", "Your first HTML page", "Links, images & structure"] },
  { title: "Make it your own", lessons: ["The basics of CSS", "Layout with flexbox", "Design for smaller screens"] },
  { title: "Build something real", lessons: ["Plan a personal website", "Put the pieces together", "Publish your first site"] },
];

export default function CoursePreview() {
  const [open, setOpen] = useState(0);
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shouldReduce = mounted && reduceMotion;

  return (
    <motion.div
      initial={false}
      animate={shouldReduce ? undefined : { opacity: [0.72, 1], y: [16, 0], rotateX: [2, 0] }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[640px] [perspective:1200px]"
    >
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-primary/15 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl shadow-black/10 backdrop-blur-xl dark:shadow-black/40">
        <div className="flex h-12 items-center gap-2 border-b border-border/70 px-4">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
          <div className="mx-auto -translate-x-5 rounded-md border border-border/60 bg-muted/60 px-8 py-1 font-mono text-[9px] text-muted-foreground sm:px-16">
            lessonmap.app/course/your-first-website
          </div>
        </div>
        <div className="grid min-h-[420px] sm:grid-cols-[150px_1fr]">
          <aside className="hidden border-r border-border/70 bg-muted/30 p-4 sm:block">
            <div className="flex items-center gap-2 text-xs font-semibold"><span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">L</span> LessonMap</div>
            <div className="mt-8 space-y-2 text-[11px] text-muted-foreground">
              <p className="rounded-md bg-background px-2.5 py-2 text-foreground shadow-sm">Course outline</p>
              <p className="px-2.5 py-2">Resources</p>
              <p className="px-2.5 py-2">Share & publish</p>
            </div>
          </aside>
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="secondary" className="mb-3 rounded-md font-mono text-[9px] uppercase tracking-widest">Web development</Badge>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Your first website</h2>
                <p className="mt-1.5 text-xs text-muted-foreground">From a blank page to something you can share.</p>
              </div>
              {/* <div className="hidden items-center gap-1.5 rounded-lg border border-border/70 px-2.5 py-2 text-[10px] text-muted-foreground sm:flex"><Check className="size-3 text-emerald-500" /> Auto-saved</div> */}
            </div>
            <div className="mt-6 space-y-2">
              {modules.map((module, index) => {
                const isOpen = open === index;
                return (
                  <div key={module.title} className="overflow-hidden rounded-xl border border-border/80 bg-background/60 transition-colors hover:border-primary/40">
                    <button type="button" onClick={() => setOpen(isOpen ? -1 : index)} aria-expanded={isOpen} aria-controls={`hero-module-${index}`} className="flex min-h-12 w-full items-center gap-2.5 px-3 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary sm:px-4">
                      <GripVertical className="size-3.5 text-muted-foreground/50" aria-hidden="true" />
                      <span className="grid size-6 place-items-center rounded-md bg-primary/15 font-mono text-[9px] font-bold text-primary-foreground dark:text-primary">0{index + 1}</span>
                      <span className="flex-1 text-xs font-semibold sm:text-sm">{module.title}</span>
                      <span className="text-[10px] text-muted-foreground">{module.lessons.length} lessons</span>
                      <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                      <motion.ol id={`hero-module-${index}`} initial={shouldReduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: shouldReduce ? 0 : 0.22 }} className="overflow-hidden border-t border-border/60">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <li key={lesson} className="flex items-center gap-3 px-4 py-2.5 pl-12 text-[11px] text-muted-foreground sm:text-xs">
                              <span className="font-mono text-[9px]">{index + 1}.{lessonIndex + 1}</span>
                              <span className="flex-1">{lesson}</span>
                              {lessonIndex === 0 && <FileText className="size-3" aria-label="Has a resource" />}
                            </li>
                          ))}
                        </motion.ol>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground"><span className="flex items-center gap-1.5"><Layers3 className="size-3" />3 modules · 9 lessons</span><span>Click a module to explore</span></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

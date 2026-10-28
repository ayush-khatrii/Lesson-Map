"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, FileText, GripVertical, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type CourseModule = {
  title: string;
  lessons: [string, string, string];
};

type CourseExample = {
  slug: string;
  category: string;
  title: string;
  description: string;
  modules: [CourseModule, CourseModule, CourseModule];
};

const COURSE_INTERVAL = 3000;

const courses: CourseExample[] = [
  {
    slug: "icse-10-physics",
    category: "ICSE · Class 10",
    title: "Physics made clear",
    description: "Connect everyday discoveries to scientific ideas.",
    modules: [
      {
        title: "Force & energy",
        lessons: [
          "Force and turning effects",
          "Work, energy and power",
          "Machines and efficiency",
        ],
      },
      {
        title: "Light & sound",
        lessons: [
          "Refraction of light",
          "Lenses and ray diagrams",
          "Sound and resonance",
        ],
      },
      {
        title: "Electricity & heat",
        lessons: [
          "Current and resistance",
          "Household circuits",
          "Calorimetry essentials",
        ],
      },
    ],
  },
  {
    slug: "your-first-website",
    category: "Web development",
    title: "Your first website",
    description: "From a blank page to something you can share.",
    modules: [
      {
        title: "Start with the web",
        lessons: [
          "How the web works",
          "Your first HTML page",
          "Links, images & structure",
        ],
      },
      {
        title: "Make it your own",
        lessons: [
          "The basics of CSS",
          "Layout with flexbox",
          "Design for smaller screens",
        ],
      },
      {
        title: "Build something real",
        lessons: [
          "Plan a personal website",
          "Put the pieces together",
          "Publish your first site",
        ],
      },
    ],
  },
  {
    slug: "icse-10-mathematics",
    category: "ICSE · Class 10",
    title: "Master mathematics",
    description: "Build clear concepts and solve with confidence.",
    modules: [
      {
        title: "Algebra essentials",
        lessons: [
          "Quadratic equations",
          "Arithmetic progressions",
          "Matrices made simple",
        ],
      },
      {
        title: "Geometry & trig",
        lessons: [
          "Similarity of triangles",
          "Circle theorems",
          "Heights and distances",
        ],
      },
      {
        title: "Practise & revise",
        lessons: [
          "Commercial mathematics",
          "Statistics and probability",
          "Mixed practice questions",
        ],
      },
    ],
  },
  {
    slug: "everyday-photography",
    category: "Photography",
    title: "Capture better photos",
    description: "Turn everyday moments into memorable images.",
    modules: [
      {
        title: "Know your camera",
        lessons: [
          "Exposure made simple",
          "Aperture and depth",
          "Shutter speed and ISO",
        ],
      },
      {
        title: "Work with light",
        lessons: [
          "Find natural light",
          "Frame a stronger photo",
          "Colour and composition",
        ],
      },
      {
        title: "Create your style",
        lessons: [
          "Shoot your first series",
          "Edit with intention",
          "Build a small portfolio",
        ],
      },
    ],
  },
  {
    slug: "confident-english",
    category: "Language learning",
    title: "Speak with confidence",
    description: "Build practical English for everyday conversations.",
    modules: [
      {
        title: "Start speaking",
        lessons: [
          "Introduce yourself",
          "Everyday expressions",
          "Pronunciation basics",
        ],
      },
      {
        title: "Keep it flowing",
        lessons: [
          "Ask better questions",
          "Share ideas and opinions",
          "Tell a short story",
        ],
      },
      {
        title: "Use it every day",
        lessons: [
          "English at work",
          "Travel conversations",
          "Your speaking challenge",
        ],
      },
    ],
  },
];

const textTransition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const,
};

type RotatingTextProps = {
  values: string[];
  activeIndex: number;
  reducedMotion: boolean;
  className?: string;
};

/**
 * Only the visible text animates.
 *
 * Invisible copies reserve enough space for every example,
 * preventing the surrounding card from jumping during rotation.
 */
function RotatingText({
  values,
  activeIndex,
  reducedMotion,
  className = "",
}: RotatingTextProps) {
  return (
    <span
      className={`relative grid min-w-0 grid-cols-[minmax(0,1fr)] ${className}`}
    >
      {values.map((value, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="invisible pointer-events-none select-none"
          style={{ gridArea: "1 / 1" }}
        >
          {value}
        </span>
      ))}

      <AnimatePresence initial={false} mode="sync">
        <motion.span
          key={activeIndex}
          className="relative block min-w-0"
          style={{ gridArea: "1 / 1" }}
          initial={
            reducedMotion
              ? false
              : {
                opacity: 0,
                filter: "blur(5px)",
                y: 5,
              }
          }
          animate={{
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
          }}
          exit={
            reducedMotion
              ? { opacity: 0 }
              : {
                opacity: 0,
                filter: "blur(4px)",
                y: -4,
              }
          }
          transition={
            reducedMotion
              ? { duration: 0 }
              : textTransition
          }
        >
          {values[activeIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function CoursePreview() {
  const [open, setOpen] = useState(0);
  const [courseIndex, setCourseIndex] = useState(0);

  const reduceMotion = useReducedMotion();
  const shouldReduce = Boolean(reduceMotion);
  const instanceId = useId();

  useEffect(() => {
    const interval = window.setInterval(() => {
      // Avoid cycling through examples while the tab is hidden.
      if (document.visibilityState !== "visible") return;

      setCourseIndex((current) => (current + 1) % courses.length);
    }, COURSE_INTERVAL);

    return () => window.clearInterval(interval);
  }, []);

  const course = courses[courseIndex];

  const textProps = {
    activeIndex: courseIndex,
    reducedMotion: shouldReduce,
  };

  return (
    <motion.div
      initial={false}
      className="relative mx-auto w-full max-w-[640px] [perspective:1200px]"
    >
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-primary/15 blur-3xl" />

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl shadow-black/10 backdrop-blur-xl dark:shadow-black/40">
        {/* Browser bar */}
        <div className="flex h-12 items-center gap-2 border-b border-border/70 px-4">
          <span className="size-2.5 shrink-0 rounded-full bg-red-400/70" />
          <span className="size-2.5 shrink-0 rounded-full bg-amber-400/70" />
          <span className="size-2.5 shrink-0 rounded-full bg-emerald-400/70" />

          <div className="mx-auto min-w-0 -translate-x-5 rounded-md border border-border/60 bg-muted/60 px-3 py-1 font-mono text-[9px] text-muted-foreground sm:px-8 lg:px-4 xl:px-8">
            <RotatingText
              {...textProps}
              values={courses.map(
                (example) => `lessonmap.app/course/${example.slug}`,
              )}
              className="truncate text-center [&>span]:truncate"
            />
          </div>
        </div>

        <div className="grid min-h-[420px] sm:grid-cols-[150px_minmax(0,1fr)]">
          {/* Sidebar remains static */}
          <aside className="hidden border-r border-border/70 bg-muted/30 p-4 sm:block">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
                L
              </span>
              LessonMap
            </div>

            <div className="mt-8 space-y-2 text-[11px] text-muted-foreground">
              <p className="rounded-md bg-background px-2.5 py-2 text-foreground shadow-sm">
                Course outline
              </p>
              <p className="px-2.5 py-2">Resources</p>
              <p className="px-2.5 py-2">Share & publish</p>
            </div>
          </aside>

          <div className="min-w-0 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge
                  variant="secondary"
                  className="mb-3 rounded-md font-mono text-[9px] uppercase tracking-widest"
                >
                  <RotatingText
                    {...textProps}
                    values={courses.map((example) => example.category)}
                  />
                </Badge>

                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  <RotatingText
                    {...textProps}
                    values={courses.map((example) => example.title)}
                  />
                </h2>

                <p className="mt-1.5 text-xs text-muted-foreground">
                  <RotatingText
                    {...textProps}
                    values={courses.map((example) => example.description)}
                  />
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {course.modules.map((module, moduleIndex) => {
                const isOpen = open === moduleIndex;
                const panelId = `${instanceId}-module-${moduleIndex}`;
                const buttonId = `${panelId}-trigger`;

                return (
                  <div
                    // Keep each module shell mounted when the course changes.
                    key={moduleIndex}
                    className="overflow-hidden rounded-xl border border-border/80 bg-background/60 transition-colors hover:border-primary/40"
                  >
                    <button
                      id={buttonId}
                      type="button"
                      onClick={() =>
                        setOpen((current) =>
                          current === moduleIndex ? -1 : moduleIndex,
                        )
                      }
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-label={`${module.title}, ${module.lessons.length} lessons`}
                      className="flex min-h-12 w-full items-center gap-2.5 px-3 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary sm:px-4"
                    >
                      <GripVertical
                        className="size-3.5 shrink-0 text-muted-foreground/50"
                        aria-hidden="true"
                      />

                      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/15 font-mono text-[9px] font-bold text-primary">
                        0{moduleIndex + 1}
                      </span>

                      <RotatingText
                        {...textProps}
                        values={courses.map(
                          (example) => example.modules[moduleIndex].title,
                        )}
                        className="flex-1 py-2 text-xs font-semibold sm:text-sm"
                      />

                      <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                        {module.lessons.length} lessons
                      </span>

                      <ChevronDown
                        className={`size-3.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""
                          }`}
                        aria-hidden="true"
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.ol
                          key="lessons"
                          id={panelId}
                          aria-labelledby={buttonId}
                          initial={
                            shouldReduce
                              ? false
                              : { height: 0, opacity: 0 }
                          }
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            duration: shouldReduce ? 0 : 0.22,
                          }}
                          className="overflow-hidden border-t border-border/60"
                        >
                          {module.lessons.map((_, lessonIndex) => (
                            <li
                              key={lessonIndex}
                              className="flex items-center gap-3 px-4 py-2.5 pl-12 text-[11px] text-muted-foreground sm:text-xs"
                            >
                              <span className="shrink-0 font-mono text-[9px]">
                                {moduleIndex + 1}.{lessonIndex + 1}
                              </span>

                              <RotatingText
                                {...textProps}
                                values={courses.map(
                                  (example) =>
                                    example.modules[moduleIndex].lessons[
                                    lessonIndex
                                    ],
                                )}
                                className="flex-1"
                              />

                              {lessonIndex === 0 && (
                                <FileText
                                  className="size-3 shrink-0"
                                  aria-label="Has a resource"
                                />
                              )}
                            </li>
                          ))}
                        </motion.ol>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Layers3 className="size-3 shrink-0" aria-hidden="true" />
                3 modules · 9 lessons
              </span>

              <span className="text-right">
                Click a module to explore
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
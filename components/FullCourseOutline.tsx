"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, Layers, ChevronRight } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Lesson {
  id: string;
  lessonName?: string;
  description?: string;
  order?: number;
}

interface Module {
  id: string;
  moduleName: string;
  description: string;
  order: number;
  courseId: string;
  Lesson: Lesson[];
}

interface Course {
  id: string;
  courseName: string;
  description: string;
  userId: string;
  Module: Module[];
}

interface FullCourseOutlineProps {
  courses?: Course[];
  className?: string;
}

// Deterministic hue from course id
function courseHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
  return h % 360;
}

// ── Empty state ───────────────────────────────────────────────────────────────
function OutlineEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
        <Layers className="w-6 h-6 text-muted-foreground opacity-50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No courses yet</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Create a course on the left to see it here
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FullCourseOutline({
  courses,
  className = "",
}: FullCourseOutlineProps) {
  if (!courses || courses.length === 0) return <OutlineEmpty />;

  return (
    <div className={`w-full px-4 py-4 ${className}`}>
      {/* Header strip */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {courses.length} {courses.length === 1 ? "Course" : "Courses"}
        </p>
      </div>

      <Accordion type="multiple" className="space-y-2.5">
        {courses.map((course) => {
          const hue = courseHue(course.id);
          const totalLessons = course.Module.reduce((a, m) => a + m.Lesson.length, 0);

          return (
            <AccordionItem
              key={course.id}
              value={course.id}
              className="group rounded-xl border border-border bg-background overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3.5 hover:no-underline hover:bg-muted/30 transition-colors [&>svg]:hidden">
                <div className="flex items-center gap-3 w-full">
                  {/* Color dot */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ background: `hsl(${hue} 52% 52%)` }}
                  >
                    {course.courseName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <p className="break-words text-xs font-semibold leading-snug [overflow-wrap:anywhere] sm:text-sm">
                      {course.courseName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {course.Module.length} modules
                      </span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {totalLessons} lessons
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                {/* Thin color bar */}
                <div
                  className="w-full h-0.5 rounded-full mb-3 opacity-60"
                  style={{ background: `hsl(${hue} 52% 52%)` }}
                />

                {course.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3 px-1">
                    {course.description}
                  </p>
                )}

                {course.Module.length > 0 ? (
                  <Accordion type="multiple" className="space-y-1.5">
                    {course.Module.sort((a, b) => a.order - b.order).map(
                      (module, idx) => (
                        <AccordionItem
                          key={module.id}
                          value={module.id}
                          className="border border-border rounded-xl bg-muted/20 overflow-hidden"
                        >
                          <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/40 [&>svg]:hidden transition-colors">
                            <div className="flex items-center gap-2.5 w-full">
                              <div
                                className="flex-shrink-0 w-6 h-6 rounded-md text-white flex items-center justify-center text-[10px] font-bold"
                                style={{ background: `hsl(${hue} 52% 52%)` }}
                              >
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="break-words text-[11px] font-semibold leading-snug [overflow-wrap:anywhere] sm:text-xs">
                                  {module.moduleName}
                                </p>
                                {module.description && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                    {module.description}
                                  </p>
                                )}
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-[9px] h-4 px-1.5 flex-shrink-0"
                              >
                                {module.Lesson.length}
                              </Badge>
                              <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                            </div>
                          </AccordionTrigger>

                          <AccordionContent className="px-3 pb-3">
                            {module.Lesson.length > 0 ? (
                              <div className="space-y-1 mt-2">
                                {module.Lesson.sort(
                                  (a, b) => (a.order || 0) - (b.order || 0)
                                ).map((lesson, li) => (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-background border border-border/60 hover:border-border transition-colors"
                                  >
                                    <div className="flex-shrink-0 w-4 h-4 rounded border border-border flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                                      {li + 1}
                                    </div>
                                    <p className="min-w-0 flex-1 break-words text-[11px] font-medium leading-snug [overflow-wrap:anywhere] sm:text-xs">
                                      {lesson.lessonName || `Lesson ${li + 1}`}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">
                                <p className="text-[10px]">No lessons yet</p>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      )
                    )}
                  </Accordion>
                ) : (
                  <div className="text-center py-5 rounded-xl border border-dashed border-border">
                    <FileText className="h-5 w-5 mx-auto mb-1 opacity-30" />
                    <p className="text-[10px] text-muted-foreground">No modules yet</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Eye,
  GraduationCap,
  Layers,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  exampleCourses,
  type ExampleCourseTemplate,
} from "@/constants";

function templateUrl(id: string) {
  return `/dashboard/create/new?template=${encodeURIComponent(id)}`;
}

function lessonCount(course: ExampleCourseTemplate) {
  return course.modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );
}

function PreviewDialog({
  course,
  onClose,
}: {
  course: ExampleCourseTemplate | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(course)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {course && (
          <>
            <DialogHeader className="shrink-0 space-y-2 border-b border-border px-4 py-4 text-left sm:px-6">
              <div className="flex items-center gap-2 pr-8">
                <Badge variant="secondary">{course.category}</Badge>
                <Badge variant="outline">{course.level}</Badge>
              </div>
              <DialogTitle className="break-words text-xl">
                {course.title}
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                {course.description}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
              {course.modules.map((module, moduleIndex) => (
                <div
                  key={module.title}
                  className="rounded-xl border border-border bg-card p-3 sm:p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {moduleIndex + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-semibold">
                        {module.title}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {module.description}
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="break-words">
                              {lessonIndex + 1}. {lesson}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="shrink-0 border-t border-border p-4 sm:px-6">
              <Button asChild className="w-full gap-2 sm:w-auto">
                <Link href={templateUrl(course.id)}>
                  <Sparkles className="h-4 w-4" /> Use Template
                </Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateRow({
  course,
  onPreview,
}: {
  course: ExampleCourseTemplate;
  onPreview: (course: ExampleCourseTemplate) => void;
}) {
  const lessons = lessonCount(course);

  return (
    <AccordionItem
      value={course.id}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors data-[state=open]:border-primary/30"
    >
      <AccordionTrigger className="px-3 py-3 text-left hover:bg-accent/50 hover:no-underline sm:px-6 sm:py-5 [&>svg]:hidden">
        <div className="flex w-full min-w-0 items-start gap-3 sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-sm font-bold text-muted-foreground">
            {course.title.charAt(0)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-sm font-semibold leading-snug sm:text-base">
                {course.title}
              </h2>
              <Badge variant="secondary" className="text-[10px]">
                {course.category}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {course.level}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {course.description}
            </p>
          </div>

          <div className="mr-2 hidden shrink-0 items-center gap-3 sm:flex">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> {course.modules.length} modules
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" /> {lessons} lessons
            </span>
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-3 pb-4 sm:px-6 sm:pb-6">
        <Separator className="mb-4" />

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          {course.modules.map((module, moduleIndex) => (
            <div
              key={module.title}
              className="rounded-xl border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-xs font-semibold">
                  {moduleIndex + 1}
                </span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    {module.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {module.lessons.length} lessons
                  </p>
                  <div className="mt-2 space-y-1">
                    {module.lessons.map((lesson) => (
                      <p
                        key={lesson}
                        className="break-words text-xs text-muted-foreground"
                      >
                        • {lesson}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => onPreview(course)}
          >
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button size="sm" className="gap-2" asChild>
            <Link href={templateUrl(course.id)}>
              <Sparkles className="h-4 w-4" /> Use Template
            </Link>
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function ExamplePage() {
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<ExampleCourseTemplate | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return exampleCourses;

    return exampleCourses.filter((course) =>
      [course.title, course.description, course.category, course.level].some(
        (value) => value.toLowerCase().includes(query),
      ),
    );
  }, [search]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 pt-24 sm:px-6 lg:px-8">
        <section className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Ready-to-use templates
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
              Start your course faster
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Choose a complete outline, customize any detail, and save it as
              your own course.
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates"
              className="h-10 bg-background pl-10"
            />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold">Course templates</h2>
            <Badge variant="outline">{filtered.length}</Badge>
          </div>

          {filtered.length ? (
            <Accordion type="single" collapsible className="space-y-3">
              {filtered.map((course) => (
                <TemplateRow
                  key={course.id}
                  course={course}
                  onPreview={setPreview}
                />
              ))}
            </Accordion>
          ) : (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
              <p className="font-medium">No templates found</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setSearch("")}
              >
                Clear search
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="font-semibold">Want to start from scratch?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open a blank builder or use AI to generate a custom outline.
          </p>
          <Button variant="outline" size="sm" className="mt-4 gap-2" asChild>
            <Link href="/dashboard/create/new">
              <Plus className="h-4 w-4" /> Blank course
            </Link>
          </Button>
        </section>
      </main>

      <PreviewDialog course={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

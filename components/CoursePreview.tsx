"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Circle,
  Lock,
  GraduationCap,
  LayoutGrid,
  List,
  Share2,
  Menu,
  X,
  Layers,
  Clock,
  Heart,
  Zap,
  ArrowRight,
  Trophy,
  BookOpen,
  FileText,
  Link2,
  Newspaper,
  ExternalLink,
  MapPin,
  ChevronDown,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useLessonProgress } from "@/lib/useLessonProgress";
import { cn } from "@/lib/utils";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockBody,
  CodeBlockItem,
  CodeBlockContent,
} from "@/components/kibo-ui/code-block";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResourceType = "Code" | "PDF" | "Link" | "Note" | "Image";

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  meta?: string | null;
  url?: string;
  content?: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  done?: boolean;
  resources?: Resource[];
}

export interface Module {
  id: string;
  label: string;
  title: string;
  description: string;
  completed?: number;
  total?: number;
  lessons: Lesson[];
}

export interface Creator {
  name: string;
  avatar: string | null;
  role?: string;
  bio?: string;
}

export interface CourseStats {
  modules: number;
  lessons: number;
  hours?: string;
  students?: string;
}

export interface Course {
  id?: string;
  title: string;
  description: string;
  audience?: string | null;
  creator: Creator;
  stats: CourseStats;
  modules: Module[];
}

// ─── Mock resource enrichment ─────────────────────────────────────────────────

export const MOCK_LESSON_RESOURCES: Resource[] = [
  {
    id: "r1",
    title: "Server Components — Official Docs",
    type: "Link",
    url: "https://nextjs.org/docs/app/building-your-application/rendering/server-components",
  },
  {
    id: "r2",
    title: "RSC Architecture PDF Cheatsheet",
    type: "PDF",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "r3",
    title: "Next.js GitHub Repository",
    type: "Link",
    url: "https://github.com/vercel/next.js",
  },
];

export function enrichCourseWithMockResources(course: Course): Course {
  return {
    ...course,
    modules: course.modules.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((lesson) =>
        lesson.id === "l3"
          ? { ...lesson, resources: MOCK_LESSON_RESOURCES }
          : lesson,
      ),
    })),
  };
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

export const SAMPLE_COURSE: Course = {
  id: "nextjs-15-masterclass",
  title: "Next.js 15 Masterclass: From Zero to Production",
  description:
    "A complete course covering Server Actions, Server Components, and scalable full-stack development using Next.js 15.",
  creator: {
    name: "Alex Rivera",
    avatar: null,
    role: "Senior Full-Stack Engineer",
    bio: "10+ years building scalable web apps. I teach what I ship.",
  },
  stats: { modules: 8, lessons: 42, hours: "12.5", students: "3.2k" },
  modules: [
    {
      id: "m1",
      label: "Module 1",
      title: "Intro to Next.js 15",
      description: "Overview of new features and the App Router paradigm.",
      lessons: [
        { id: "l1", title: "What is Next.js?", done: true },
        { id: "l2", title: "App Router vs Pages Router", done: true },
        { id: "l3", title: "Server Components Explained", done: true },
        { id: "l4", title: "Client Components Explained", done: true },
        { id: "l5", title: "Deploying Your Next.js App", done: true },
        { id: "l6", title: "Next.js 15 New APIs", done: true },
      ],
    },
    {
      id: "m2",
      label: "Module 2",
      title: "Routing & Layouts",
      description:
        "Deep dive into nested layouts, route groups, and parallel routes.",
      lessons: [
        { id: "l7", title: "File-Based Routing", done: true },
        { id: "l8", title: "Nested Layouts", done: true },
        { id: "l9", title: "Route Groups", done: true },
        { id: "l10", title: "Parallel & Intercepting Routes", done: false },
        { id: "l11", title: "Loading & Error States", done: false },
      ],
    },
    {
      id: "m3",
      label: "Module 3",
      title: "Server Components",
      description: "Understanding SSR, hydration, and data fetching patterns.",
      lessons: [
        { id: "l12", title: "RSC Architecture", done: false },
        { id: "l13", title: "fetch() with caching", done: false },
        { id: "l14", title: "Streaming with Suspense", done: false },
        { id: "l15", title: "Server-Only Code", done: false },
        { id: "l16", title: "Third-party Libraries", done: false },
        { id: "l17", title: "Patterns & Best Practices", done: false },
      ],
    },
    {
      id: "m4",
      label: "Module 4",
      title: "Server Actions",
      description: "Mutations, forms, and the new action paradigm.",
      lessons: [
        { id: "l18", title: "Defining Server Actions", done: false },
        { id: "l19", title: "Forms & useFormState", done: false },
        { id: "l20", title: "Optimistic Updates", done: false },
        { id: "l21", title: "Revalidation Strategies", done: false },
        { id: "l22", title: "Error Handling", done: false },
      ],
    },
    {
      id: "m5",
      label: "Module 5",
      title: "Database Integration",
      description: "Prisma, Drizzle ORM, and edge-compatible databases.",
      lessons: [
        { id: "l23", title: "Setting up Prisma", done: false },
        { id: "l24", title: "Schema Design", done: false },
        { id: "l25", title: "Edge Databases (Turso)", done: false },
        { id: "l26", title: "Migrations & Seeding", done: false },
        { id: "l27", title: "Query Optimization", done: false },
      ],
    },
    {
      id: "m6",
      label: "Module 6",
      title: "Authentication",
      description: "NextAuth v5, middleware, and protected routes.",
      lessons: [
        { id: "l28", title: "NextAuth v5 Setup", done: false },
        { id: "l29", title: "OAuth Providers", done: false },
        { id: "l30", title: "Middleware Guards", done: false },
        { id: "l31", title: "Session Management", done: false },
      ],
    },
    {
      id: "m7",
      label: "Module 7",
      title: "Performance & Optimization",
      description: "Core Web Vitals, Image optimization, and bundle analysis.",
      lessons: [
        { id: "l32", title: "Image & Font Optimization", done: false },
        { id: "l33", title: "Bundle Analysis", done: false },
        { id: "l34", title: "Core Web Vitals", done: false },
        { id: "l35", title: "Edge & Middleware Perf", done: false },
        { id: "l36", title: "Caching Deep Dive", done: false },
      ],
    },
    {
      id: "m8",
      label: "Module 8",
      title: "Production Deployment",
      description: "Vercel, self-hosting, CI/CD, and monitoring.",
      lessons: [
        { id: "l37", title: "Vercel Deployment", done: false },
        { id: "l38", title: "Self-Hosting with Docker", done: false },
        { id: "l39", title: "Environment Variables", done: false },
        { id: "l40", title: "CI/CD with GitHub Actions", done: false },
        { id: "l41", title: "Monitoring & Logging", done: false },
        { id: "l42", title: "Scaling Strategies", done: false },
      ],
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RESOURCE_META: Record<
  ResourceType,
  { icon: LucideIcon; label: string; color: string }
> = {
  Code: { icon: FileText, label: "Code", color: "text-primary" },
  PDF: { icon: FileText, label: "PDF", color: "text-destructive" },
  Link: { icon: Link2, label: "Link", color: "text-chart-2" },
  Note: { icon: Newspaper, label: "Note", color: "text-primary" },
  Image: { icon: FileText, label: "Image", color: "text-chart-4" },
};

function getSeedIds(modules: Module[]): string[] {
  return modules.flatMap((m) =>
    m.lessons.filter((l) => l.done).map((l) => l.id),
  );
}

function clickUnlessSelecting(handler: () => void) {
  return () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    handler();
  };
}

const SELECTABLE_TEXT =
  "select-text [&_*]:select-text [&_button]:!select-text [&_[data-slot=accordion-trigger]]:!select-text [&_a]:select-text";

function moduleProgress(
  mod: Module,
  isDone: (id: string) => boolean,
): { completed: number; total: number; pct: number } {
  const total = mod.lessons.length;
  const completed = mod.lessons.filter((l) => isDone(l.id)).length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, pct };
}

// ─── Upgrade Dialog ───────────────────────────────────────────────────────────

function UpgradeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-primary/20 bg-background text-foreground">
        <DialogHeader>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Premium Feature
              </p>
              <DialogTitle className="text-xl text-foreground">
                Upgrade to Creator Plan
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="leading-relaxed text-muted-foreground">
            <span className="font-semibold text-primary">Flow View</span>{" "}
            gives you an interactive node graph of your entire learning path —
            visualize connections and unlock milestones as you advance.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-border text-foreground hover:bg-secondary hover:text-foreground"
            onClick={onClose}
          >
            Maybe Later
          </Button>
          <Button className="flex-1 gap-2 bg-primary font-bold text-primary-foreground hover:bg-primary/90">
            Upgrade Now <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Navbar (non-sticky) ──────────────────────────────────────────────────────

function CourseNavbar({ creator }: { creator: Creator }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="border-b border-border bg-background/80 backdrop-blur-xl"
      style={{ position: "relative" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
            <Layers className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-foreground">
              LessonMap
            </span>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Shared by {creator.name}
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <Badge
            variant="outline"
            className="gap-1.5 border-border text-muted-foreground"
          >
            <MapPin className="h-3 w-3" /> Public page
          </Badge>
          <Separator orientation="vertical" className="h-5 bg-secondary" />
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {creator.name[0]}
            </div>
            <span className="text-xs font-medium text-foreground">
              {creator.name}
            </span>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                navigator.share({
                  title: "LessonMap Course",
                  url: window.location.href,
                });
              } else {
                navigator.clipboard?.writeText(window.location.href);
              }
            }}
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-background px-5 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {creator.name[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{creator.name}</p>
                {creator.role && (
                  <p className="text-xs text-muted-foreground">{creator.role}</p>
                )}
              </div>
            </div>
            <Button className="w-full gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
              <Share2 className="h-4 w-4" /> Share Course
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-none text-foreground">{value}</p>
          <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Resource Row ─────────────────────────────────────────────────────────────

function ResourceRow({
  resource,
  onPreview,
}: {
  resource: Resource;
  onPreview: (resource: Resource) => void;
}) {
  const meta = RESOURCE_META[resource.type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onPreview(resource)}
      className="group flex min-w-0 w-full select-text items-center gap-3 rounded-xl border border-border bg-card/60 px-3 py-3 text-left transition-colors hover:border-primary/25 hover:bg-primary/5 sm:px-4"
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/80",
          meta.color,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground group-hover:text-foreground">
          {resource.title}
        </p>
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {resource.meta || meta.label}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
        View
        {resource.url && <ExternalLink className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

function ResourcePreviewDialog({
  resource,
  onClose,
}: {
  resource: Resource | null;
  onClose: () => void;
}) {
  if (!resource) return null;

  const isImage = resource.type === "Image";
  const isPdf = resource.type === "PDF";
  const isCode = resource.type === "Code";
  const hasText = Boolean(resource.content?.trim());

  return (
    <Dialog open={Boolean(resource)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[82vh] w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-hidden border-border bg-background p-0 text-foreground">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 text-left sm:px-5">
          <DialogTitle className="break-words pr-8 text-base sm:text-lg">
            {resource.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {resource.type} resource
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {isImage && resource.url ? (
            <div className="flex justify-center rounded-xl bg-muted p-2">
              <img
                src={resource.url}
                alt={resource.title}
                className="max-h-[60vh] max-w-full rounded-lg object-contain"
              />
            </div>
          ) : isPdf && resource.url ? (
            <iframe
              src={resource.url}
              title={resource.title}
              className="h-[60vh] min-h-[360px] w-full rounded-xl border border-border bg-background"
            />
          ) : isCode && hasText ? (
            <div className="max-h-[62vh] overflow-auto rounded-lg border border-border">
              <CodeBlock
                value={resource.title}
                data={[
                  {
                    language: "typescript",
                    filename: resource.title,
                    code: resource.content ?? "",
                  },
                ]}
              >
                <CodeBlockHeader className="border-b border-border bg-muted/80 px-3 py-2">
                  <span className="truncate text-xs font-medium text-muted-foreground">
                    {resource.title}
                  </span>
                </CodeBlockHeader>
                <CodeBlockBody>
                  {(item) => (
                    <CodeBlockItem value={item.filename} lineNumbers>
                      <CodeBlockContent language={"typescript" as any}>
                        {resource.content ?? ""}
                      </CodeBlockContent>
                    </CodeBlockItem>
                  )}
                </CodeBlockBody>
              </CodeBlock>
            </div>
          ) : hasText ? (
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/70 p-4 font-mono text-xs leading-relaxed text-foreground sm:text-sm">
              {resource.content}
            </pre>
          ) : resource.url ? (
            <div className="space-y-4">
              <iframe
                src={resource.url}
                title={resource.title}
                className="h-[55vh] min-h-[320px] w-full rounded-xl border border-border bg-background"
              />
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              This resource does not have a preview available.
            </p>
          )}

          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary"
            >
              Open original resource <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Module Sidebar Accordion ─────────────────────────────────────────────────

function ModuleSidebar({
  modules,
  isDone,
  onToggleLesson,
  selectedLessonId,
  onSelectLesson,
  openModuleId,
  onOpenModule,
}: {
  modules: Module[];
  isDone: (id: string) => boolean;
  onToggleLesson: (id: string) => void;
  selectedLessonId: string | null;
  onSelectLesson: (moduleId: string, lessonId: string) => void;
  openModuleId: string;
  onOpenModule: (id: string) => void;
}) {
  return (
    <Accordion
      type="single"
      collapsible
      value={openModuleId}
      onValueChange={onOpenModule}
      className="space-y-2"
    >
      {modules.map((mod, mi) => {
        const { pct } = moduleProgress(mod, isDone);
        const isComplete = pct === 100;
        const isStarted = pct > 0 && pct < 100;

        return (
          <AccordionItem
            key={mod.id}
            value={mod.id}
            className="overflow-hidden rounded-2xl border border-border bg-card/60 data-[state=open]:border-primary/30"
          >
            <AccordionTrigger className="select-text px-3 py-3 hover:no-underline hover:bg-accent/30 sm:px-4 sm:py-4 [&[data-state=open]]:bg-primary/5">
              <div className="flex w-full min-w-0 items-start gap-2 pr-1 sm:items-center sm:gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    isComplete
                      ? "border border-primary/30 bg-primary/10 text-primary"
                      : "border border-border bg-secondary text-muted-foreground",
                  )}
                >
                  {isComplete ? (
                    <Trophy className="h-3.5 w-3.5" />
                  ) : (
                    String(mi + 1).padStart(2, "0")
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      isComplete
                        ? "text-primary"
                        : isStarted
                          ? "text-primary"
                          : "text-muted-foreground",
                    )}
                  >
                    {mod.label}
                  </p>
                  <p className="break-words text-xs font-semibold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-sm">
                    {mod.title}
                  </p>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-3 pb-3 pt-0">
              <Separator className="mb-2 bg-accent/20" />
              <div className="space-y-1">
                {mod.lessons.map((lesson, li) => {
                  const done = isDone(lesson.id);
                  const selected = selectedLessonId === lesson.id;

                  return (
                    <div key={lesson.id} className="space-y-1">
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all",
                          selected
                            ? "border border-primary/30 bg-primary/10"
                            : "border border-transparent hover:bg-accent/40",
                        )}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLesson(lesson.id);
                          }}
                          className="shrink-0"
                          aria-label={
                            done ? "Mark incomplete" : "Mark complete"
                          }
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground hover:text-muted-foreground" />
                          )}
                        </button>

                        <div
                          role="button"
                          tabIndex={0}
                          onClick={clickUnlessSelecting(() =>
                            onSelectLesson(mod.id, lesson.id),
                          )}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelectLesson(mod.id, lesson.id);
                            }
                          }}
                          className="min-w-0 flex-1 cursor-pointer text-left select-text"
                        >
                          <span
                            className={cn(
                              "block break-words text-xs font-medium leading-snug [overflow-wrap:anywhere] sm:text-sm",
                              done ? "text-muted-foreground line-through" : "text-foreground",
                            )}
                          >
                            <span className="mr-1.5 text-xs text-muted-foreground">
                              {li + 1}.
                            </span>
                            {lesson.title}
                          </span>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

// ─── Main Content Panel ───────────────────────────────────────────────────────

function LessonContentPanel({
  courseTitle,
  module,
  lesson,
  isDone,
  onToggleLesson,
}: {
  courseTitle: string;
  module: Module | null;
  lesson: Lesson | null;
  isDone: (id: string) => boolean;
  onToggleLesson: (id: string) => void;
}) {
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  useEffect(() => {
    setResourcesOpen(false);
    setPreviewResource(null);
  }, [lesson?.id]);

  if (!module || !lesson) {
    return (
      <div className="flex h-full min-h-[420px] flex-col p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <BookOpen className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mb-2 break-words text-lg font-bold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-xl">
          Welcome to {courseTitle}
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-muted-foreground">
          Select a lesson from the sidebar to begin. Your progress is saved
          locally in your browser — pick up where you left off anytime.
        </p>
      </div>
    );
  }

  const done = isDone(lesson.id);
  return (
    <>
      <div className="flex min-h-[420px] flex-col rounded-2xl border border-border bg-card/50">
        <div className="border-b border-border px-6 py-5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            {module.label}
          </p>
          <h2 className="break-words text-lg font-bold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-xl">{lesson.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
        </div>

        <div className="flex-1 px-6 py-6">
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Part of {module.title}. Continue through the lesson list to track
            your progress.
          </p>

          {lesson.resources && lesson.resources.length > 0 && (
            <div className="mb-5 overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
              <button
                type="button"
                onClick={() => setResourcesOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
                aria-expanded={resourcesOpen}
              >
                <span>Attached resources ({lesson.resources.length})</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    resourcesOpen && "rotate-180",
                  )}
                />
              </button>
              {resourcesOpen && (
                <div className="border-t border-primary/10 p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {lesson.resources.map((r) => (
                      <ResourceRow
                        key={r.id}
                        resource={r}
                        onPreview={setPreviewResource}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            className={cn(
              "w-full gap-2 font-semibold",
              done
                ? "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            variant={done ? "outline" : "default"}
            onClick={() => onToggleLesson(lesson.id)}
          >
            {done ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Mark as incomplete
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Mark lesson complete
              </>
            )}
          </Button>
        </div>
      </div>
      <ResourcePreviewDialog
        resource={previewResource}
        onClose={() => setPreviewResource(null)}
      />
    </>
  );
}

// ─── Flow View (Locked) ───────────────────────────────────────────────────────

function FlowView({
  modules,
  onLockClick,
}: {
  modules: Module[];
  onLockClick: () => void;
}) {
  const nodes = modules.map((module, index) => ({
    id: module.id,
    x: index % 2 === 0 ? 80 : 520,
    y: 30 + Math.floor(index / 2) * 110,
    title: module.title,
    done: false,
    label: String(index + 1).padStart(2, "0"),
  }));
  const edges: [string, string][] = nodes
    .slice(1)
    .map((node, index) => [nodes[index].id, node.id]);
  const nm = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border"
      style={{
        minHeight: 500,
        background:
          "radial-gradient(ellipse at 50% 30%, color-mix(in oklch, var(--primary) 8%, transparent) 0%, var(--background) 60%)",
      }}
    >
      <div
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={{
          backdropFilter: "blur(10px)",
          background:
            "color-mix(in oklch, var(--background) 80%, transparent)",
        }}
      >
        <Card className="max-w-sm border-primary/20 bg-popover/95 text-center shadow-2xl">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mb-2 text-base font-bold text-foreground">
              Flow View Locked
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              See your full learning path as an interactive node graph on the
              Creator Plan.
            </p>
            <Button
              onClick={onLockClick}
              className="w-full gap-2 bg-primary font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Zap className="h-3.5 w-3.5" /> Unlock Flow View
            </Button>
          </CardContent>
        </Card>
      </div>
      <svg
        width="100%"
        height="480"
        viewBox="0 0 760 480"
        style={{ filter: "blur(2px)", opacity: 0.25 }}
      >
        {edges.map(([a, b], i) => {
          const na = nm[a],
            nb = nm[b];
          return (
            <line
              key={i}
              x1={na.x + 80}
              y1={na.y + 30}
              x2={nb.x + 80}
              y2={nb.y + 30}
              stroke="var(--primary)"
              strokeWidth="1"
              strokeDasharray="5 5"
              opacity="0.4"
            />
          );
        })}
        {nodes.map((n) => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <rect
              width="160"
              height="58"
              rx="14"
              fill={n.done ? "var(--accent)" : "var(--card)"}
              stroke={n.done ? "var(--primary)" : "var(--border)"}
              strokeWidth="1.5"
            />
            <text
              x="12"
              y="22"
              fill="var(--primary)"
              fontSize="9"
              fontWeight="700"
            >
              {n.label}
            </text>
            <text
              x="12"
              y="42"
              fill={n.done ? "var(--foreground)" : "var(--muted-foreground)"}
              fontSize="11"
              fontWeight="500"
            >
              {n.title}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ViewMode = "accordion" | "flow";

export default function LessonMapPublicPage({
  course: rawCourse = SAMPLE_COURSE,
  slug,
}: {
  course?: Course;
  slug?: string;
}) {
  const course = useMemo(
    () => rawCourse === SAMPLE_COURSE ? enrichCourseWithMockResources(rawCourse) : rawCourse,
    [rawCourse],
  );
  const courseId = slug ?? course.id ?? "default-course";

  const seedIds = useMemo(() => getSeedIds(course.modules), [course.modules]);
  const { isDone, toggle, completedCount, hydrated } = useLessonProgress(
    courseId,
    seedIds,
  );

  const [view, setView] = useState<ViewMode>("accordion");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [openModuleId, setOpenModuleId] = useState(course.modules[0]?.id ?? "");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const totalLessons = course.modules.reduce(
    (s, m) => s + m.lessons.length,
    0,
  );
  const overallPct =
    totalLessons === 0
      ? 0
      : Math.round((completedCount / totalLessons) * 100);

  const selectedModule = useMemo(
    () =>
      course.modules.find((m) =>
        m.lessons.some((l) => l.id === selectedLessonId),
      ) ?? null,
    [course.modules, selectedLessonId],
  );

  const selectedLesson = useMemo(
    () =>
      selectedModule?.lessons.find((l) => l.id === selectedLessonId) ?? null,
    [selectedModule, selectedLessonId],
  );

  const handleSelectLesson = useCallback(
    (moduleId: string, lessonId: string) => {
      setOpenModuleId(moduleId);
      setSelectedLessonId(lessonId);
    },
    [],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background text-foreground", SELECTABLE_TEXT)}>

      <CourseNavbar creator={course.creator} />
      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        {/* ── Dashboard shell (wireframe container) ── */}
        <div>
          {/* Header strip */}
          <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-6 md:px-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-primary/25 bg-primary/10 text-xs font-bold uppercase tracking-wide text-primary">
                Public Course
              </Badge>
            </div>
            <h1 className="break-words text-lg font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-2xl md:text-3xl">
              {course.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
            {course.audience && <p className="mt-2 text-sm text-muted-foreground">For: {course.audience}</p>}
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 gap-3 border-b border-border py-5">
            <StatCard icon={Layers} value={course.stats.modules} label="Modules" />
            <StatCard
              icon={BookOpen}
              value={course.stats.lessons}
              label="Lessons"
            />
            {course.stats.hours && (
              <StatCard
                icon={Clock}
                value={`${course.stats.hours}h`}
                label="Content"
              />
            )}
          </div>

          {/* Progress bar */}
          <div className="border-b border-border px-6 py-4 md:px-8">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">Your progress</span>
              <span className="font-bold text-primary">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="mt-2 h-2 bg-secondary" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {completedCount} of {totalLessons} lessons · saved locally in your
              browser
            </p>
          </div>

          {/* View toggle + two-column body */}
          <div className="py-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                Course curriculum
              </h2>
              <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setView("accordion")}
                  className={cn(
                    "gap-1.5 rounded-lg text-xs font-semibold transition-all",
                    view === "accordion"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List className="h-3.5 w-3.5" /> List
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setView("flow");
                    setUpgradeOpen(true);
                  }}
                  className={cn(
                    "gap-1.5 rounded-lg text-xs font-semibold transition-all",
                    view === "flow"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Lock className="h-3 w-3" />
                  <LayoutGrid className="h-3.5 w-3.5" /> Flow
                </Button>
              </div>
            </div>

            {view === "accordion" ? (
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(280px,340px)_1fr]">
                {/* Left: module accordions */}
                <div className="pr-1">
                  <ModuleSidebar
                    modules={course.modules}
                    isDone={isDone}
                    onToggleLesson={toggle}
                    selectedLessonId={selectedLessonId}
                    onSelectLesson={handleSelectLesson}
                    openModuleId={openModuleId}
                    onOpenModule={setOpenModuleId}
                  />
                </div>

                {/* Right: lesson content panel */}
                <LessonContentPanel
                  courseTitle={course.title}
                  module={selectedModule}
                  lesson={selectedLesson}
                  isDone={isDone}
                  onToggleLesson={toggle}
                />
              </div>
            ) : (
              <FlowView
                modules={course.modules}
                onLockClick={() => setUpgradeOpen(true)}
              />
            )}
          </div>

          {/* Instructor footer inside shell */}
          <div className="border-t border-border px-6 py-5 md:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">
                {course.creator.name[0]}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Course creator
                </p>
                <h3 className="text-base font-bold text-foreground">
                  {course.creator.name}
                </h3>
                {course.creator.role && (
                  <p className="text-sm font-medium text-primary">
                    {course.creator.role}
                  </p>
                )}
                {course.creator.bio && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {course.creator.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-3 w-3 fill-destructive text-destructive" />
            <span>by</span>
            <span className="font-semibold text-muted-foreground">LessonMap</span>
            <span>·</span>
            <span>Stacex Technologies</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Stacex Technologies. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

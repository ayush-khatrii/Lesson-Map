"use client";

import { useState, useMemo, useCallback } from "react";
import CurrentYear from "@/components/CurrentYear";
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
  FolderOpen,
  Users,
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResourceType = "Code" | "PDF" | "Link" | "Note" | "Image";

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
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
  role: string;
  bio: string;
}

export interface CourseStats {
  modules: number;
  lessons: number;
  hours: string;
  students: string;
}

export interface Course {
  id?: string;
  title: string;
  description: string;
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
  Code: { icon: FileText, label: "Code", color: "text-purple-400" },
  PDF: { icon: FileText, label: "PDF", color: "text-red-400" },
  Link: { icon: Link2, label: "Link", color: "text-blue-400" },
  Note: { icon: Newspaper, label: "Note", color: "text-emerald-400" },
  Image: { icon: FileText, label: "Image", color: "text-amber-400" },
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
      <DialogContent className="max-w-md border-amber-500/20 bg-zinc-950 text-white">
        <DialogHeader>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
              <Zap className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
                Premium Feature
              </p>
              <DialogTitle className="text-xl text-white">
                Upgrade to Creator Plan
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="leading-relaxed text-zinc-400">
            <span className="font-semibold text-amber-400">Flow View</span>{" "}
            gives you an interactive node graph of your entire learning path —
            visualize connections and unlock milestones as you advance.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            onClick={onClose}
          >
            Maybe Later
          </Button>
          <Button className="flex-1 gap-2 bg-amber-500 font-bold text-black hover:bg-amber-400">
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
      className="border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl"
      style={{ position: "relative" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500">
            <Layers className="h-4 w-4 text-black" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">
              LessonMap
            </span>
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Shared by creator
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <Badge
            variant="outline"
            className="gap-1.5 border-zinc-800 text-zinc-400"
          >
            <MapPin className="h-3 w-3" /> Public page
          </Badge>
          <Separator orientation="vertical" className="h-5 bg-zinc-800" />
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-black">
              {creator.name[0]}
            </div>
            <span className="text-xs font-medium text-zinc-300">
              {creator.name}
            </span>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-amber-500 font-semibold text-black hover:bg-amber-400"
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
          className="text-zinc-400 hover:text-white md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {menuOpen && (
        <div className="border-t border-zinc-800/60 bg-zinc-950 px-5 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-black">
                {creator.name[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{creator.name}</p>
                <p className="text-xs text-zinc-500">{creator.role}</p>
              </div>
            </div>
            <Button className="w-full gap-2 bg-amber-500 font-semibold text-black hover:bg-amber-400">
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
          <Icon className="h-4 w-4 text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-none text-white">{value}</p>
          <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Resource Row ─────────────────────────────────────────────────────────────

function ResourceRow({ resource }: { resource: Resource }) {
  const meta = RESOURCE_META[resource.type];
  const Icon = meta.icon;
  const href = resource.url || "#";
  const isExternal = resource.url && resource.url.startsWith("http");

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="group flex select-text items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-amber-500/25 hover:bg-amber-500/[0.04]"
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/80",
          meta.color,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-zinc-200 group-hover:text-white">
          {resource.title}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          {meta.label}
        </p>
      </div>
      {resource.url && (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition-colors group-hover:text-amber-400" />
      )}
    </a>
  );
}

// ─── Resources Panel (full-width accordion) ───────────────────────────────────

function ResourcesPanel({
  resources,
  isOpen,
  onToggle,
}: {
  resources: Resource[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (!resources.length) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/[0.03]">
      <div
        role="button"
        tabIndex={0}
        onClick={clickUnlessSelecting(onToggle)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-amber-400 transition-colors hover:bg-amber-500/[0.05] select-text"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            Lesson Resources ({resources.length})
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-amber-400/70 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </div>
      {isOpen && (
        <div className="border-t border-amber-500/10 px-3 pb-3 pt-2">
          <div className="grid w-full grid-cols-1 gap-2">
            {resources.map((r) => (
              <ResourceRow key={r.id} resource={r} />
            ))}
          </div>
        </div>
      )}
    </div>
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
  openResourcesId,
  onToggleResources,
}: {
  modules: Module[];
  isDone: (id: string) => boolean;
  onToggleLesson: (id: string) => void;
  selectedLessonId: string | null;
  onSelectLesson: (moduleId: string, lessonId: string) => void;
  openModuleId: string;
  onOpenModule: (id: string) => void;
  openResourcesId: string | null;
  onToggleResources: (lessonId: string) => void;
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
        const { completed, total, pct } = moduleProgress(mod, isDone);
        const isComplete = pct === 100;
        const isStarted = pct > 0 && pct < 100;

        return (
          <AccordionItem
            key={mod.id}
            value={mod.id}
            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 data-[state=open]:border-amber-500/30"
          >
            <AccordionTrigger className="select-text px-4 py-4 hover:no-underline hover:bg-white/[0.02] [&[data-state=open]]:bg-amber-500/[0.03]">
              <div className="flex w-full items-center gap-3 pr-1">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    isComplete
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border border-zinc-700 bg-zinc-800 text-zinc-500",
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
                        ? "text-emerald-400"
                        : isStarted
                          ? "text-amber-400"
                          : "text-zinc-600",
                    )}
                  >
                    {mod.label}
                  </p>
                  <p className="truncate text-sm font-semibold text-white">
                    {mod.title}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-zinc-700 text-[10px] tabular-nums text-zinc-500"
                >
                  {completed}/{total}
                </Badge>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-3 pb-3 pt-0">
              <Separator className="mb-2 bg-white/[0.05]" />
              <div className="space-y-1">
                {mod.lessons.map((lesson, li) => {
                  const done = isDone(lesson.id);
                  const selected = selectedLessonId === lesson.id;
                  const hasResources = (lesson.resources?.length ?? 0) > 0;
                  const resourcesOpen = openResourcesId === lesson.id;

                  return (
                    <div key={lesson.id} className="space-y-1">
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all",
                          selected
                            ? "border border-amber-500/30 bg-amber-500/[0.08]"
                            : "border border-transparent hover:bg-white/[0.03]",
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
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Circle className="h-4 w-4 text-zinc-600 hover:text-zinc-400" />
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
                              "block truncate text-sm font-medium",
                              done ? "text-zinc-500 line-through" : "text-zinc-200",
                            )}
                          >
                            <span className="mr-1.5 text-xs text-zinc-600">
                              {li + 1}.
                            </span>
                            {lesson.title}
                          </span>
                        </div>

                      </div>

                      {selected && hasResources && lesson.resources && (
                        <ResourcesPanel
                          resources={lesson.resources}
                          isOpen={resourcesOpen}
                          onToggle={() => onToggleResources(lesson.id)}
                        />
                      )}
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
  course,
  module,
  lesson,
  isDone,
  onToggleLesson,
  overallPct,
  completedCount,
  totalLessons,
}: {
  course: Course;
  module: Module | null;
  lesson: Lesson | null;
  isDone: (id: string) => boolean;
  onToggleLesson: (id: string) => void;
  overallPct: number;
  completedCount: number;
  totalLessons: number;
}) {
  if (!module || !lesson) {
    return (
      <div className="flex h-full min-h-[420px] flex-col p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
          <BookOpen className="h-7 w-7 text-amber-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">
          Welcome to {course.title}
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-zinc-500">
          Select a lesson from the sidebar to begin. Your progress is saved
          locally in your browser — pick up where you left off anytime.
        </p>
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-400">Your progress</span>
            <span className="font-bold text-amber-400">{overallPct}%</span>
          </div>
          <Progress value={overallPct} className="h-2 bg-zinc-800" />
          <p className="mt-2 text-xs text-zinc-600">
            {completedCount} of {totalLessons} lessons complete
          </p>
        </div>
      </div>
    );
  }

  const done = isDone(lesson.id);
  const { completed, total, pct } = moduleProgress(module, isDone);

  return (
    <div className="flex min-h-[420px] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/30">
      <div className="border-b border-zinc-800 px-6 py-5">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500">
          {module.label}
        </p>
        <h2 className="text-xl font-bold text-white">{lesson.title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{module.description}</p>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950/60 px-5 py-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            Lesson outline
          </p>
          <h3 className="text-lg font-semibold text-white">{lesson.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {module.description}
          </p>
          <p className="mt-4 text-xs text-zinc-600">
            Part of {module.title} · Shared by {course.creator.name} on
            LessonMap
          </p>
        </div>

        <div className="mb-5 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-zinc-500">Module progress</p>
            <p className="text-sm font-semibold text-white">
              {completed} / {total} lessons
            </p>
          </div>
          <div className="w-32">
            <Progress value={pct} className="h-1.5 bg-zinc-800" />
          </div>
        </div>

        {lesson.resources && lesson.resources.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Attached resources
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {lesson.resources.map((r) => (
                <ResourceRow key={r.id} resource={r} />
              ))}
            </div>
          </div>
        )}

        <Button
          className={cn(
            "w-full gap-2 font-semibold",
            done
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
              : "bg-amber-500 text-black hover:bg-amber-400",
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
  );
}

// ─── Flow View (Locked) ───────────────────────────────────────────────────────

function FlowView({ onLockClick }: { onLockClick: () => void }) {
  const nodes = [
    { id: "m1", x: 300, y: 30, title: "Intro to Next.js 15", done: true, label: "01" },
    { id: "m2", x: 80, y: 150, title: "Routing & Layouts", done: true, label: "02" },
    { id: "m3", x: 520, y: 150, title: "Server Components", done: false, label: "03" },
    { id: "m4", x: 80, y: 270, title: "Server Actions", done: false, label: "04" },
    { id: "m5", x: 520, y: 270, title: "Database", done: false, label: "05" },
    { id: "m6", x: 300, y: 370, title: "Authentication", done: false, label: "06" },
    { id: "m7", x: 100, y: 480, title: "Performance", done: false, label: "07" },
    { id: "m8", x: 500, y: 480, title: "Deployment", done: false, label: "08" },
  ];
  const edges: [string, string][] = [
    ["m1", "m2"], ["m1", "m3"], ["m2", "m4"], ["m3", "m5"],
    ["m4", "m6"], ["m5", "m6"], ["m6", "m7"], ["m6", "m8"],
  ];
  const nm = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-zinc-800"
      style={{
        minHeight: 500,
        background:
          "radial-gradient(ellipse at 50% 30%, rgba(251,191,36,0.04) 0%, #09090b 60%)",
      }}
    >
      <div
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.6)" }}
      >
        <Card className="max-w-sm border-amber-500/20 bg-zinc-950/95 text-center shadow-2xl">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <Lock className="h-5 w-5 text-amber-400" />
            </div>
            <h3 className="mb-2 text-base font-bold text-white">
              Flow View Locked
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-zinc-500">
              See your full learning path as an interactive node graph on the
              Creator Plan.
            </p>
            <Button
              onClick={onLockClick}
              className="w-full gap-2 bg-amber-500 font-bold text-black hover:bg-amber-400"
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
              stroke="#fbbf24"
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
              fill={n.done ? "#1a1208" : "#18181b"}
              stroke={n.done ? "#fbbf24" : "#3f3f46"}
              strokeWidth="1.5"
            />
            <text x="12" y="22" fill="#fbbf24" fontSize="9" fontWeight="700">
              {n.label}
            </text>
            <text
              x="12"
              y="42"
              fill={n.done ? "#e4e4e7" : "#71717a"}
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
    () => enrichCourseWithMockResources(rawCourse),
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
  const [openResourcesId, setOpenResourcesId] = useState<string | null>(null);

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
      // Auto-open resources panel if the lesson has resources
      const module = course.modules.find((m) => m.id === moduleId);
      const lesson = module?.lessons.find((l) => l.id === lessonId);
      if (lesson && (lesson.resources?.length ?? 0) > 0) {
        setOpenResourcesId(lessonId);
      } else {
        setOpenResourcesId(null);
      }
    },
    [course.modules],
  );

  const handleToggleResources = useCallback((lessonId: string) => {
    setOpenResourcesId((prev) => (prev === lessonId ? null : lessonId));
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className={cn("min-h-screen bg-zinc-950 text-zinc-100", SELECTABLE_TEXT)}
      style={{ fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');`}</style>

      <CourseNavbar creator={course.creator} />
      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Dashboard shell (wireframe container) ── */}
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
          {/* Header strip */}
          <div className="border-b border-zinc-800 px-6 py-6 md:px-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-amber-500/25 bg-amber-500/10 text-xs font-bold uppercase tracking-wide text-amber-400">
                Public Course
              </Badge>
              <Badge
                variant="outline"
                className="border-zinc-800 text-xs text-zinc-500"
              >
                Shared by {course.creator.name}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white md:text-3xl">
              {course.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
              {course.description}
            </p>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 gap-3 border-b border-zinc-800 px-6 py-5 md:grid-cols-4 md:px-8">
            <StatCard icon={Layers} value={course.stats.modules} label="Modules" />
            <StatCard
              icon={BookOpen}
              value={course.stats.lessons}
              label="Lessons"
            />
            <StatCard
              icon={Clock}
              value={`${course.stats.hours}h`}
              label="Content"
            />
            <StatCard
              icon={Users}
              value={course.stats.students}
              label="Students"
            />
          </div>

          {/* Progress bar */}
          <div className="border-b border-zinc-800 px-6 py-4 md:px-8">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-white">Your progress</span>
              <span className="font-bold text-amber-400">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="mt-2 h-2 bg-zinc-800" />
            <p className="mt-1.5 text-xs text-zinc-600">
              {completedCount} of {totalLessons} lessons · saved locally in your
              browser
            </p>
          </div>

          {/* View toggle + two-column body */}
          <div className="px-6 py-6 md:px-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                Course curriculum
              </h2>
              <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setView("accordion")}
                  className={cn(
                    "gap-1.5 rounded-lg text-xs font-semibold transition-all",
                    view === "accordion"
                      ? "bg-amber-500 text-black hover:bg-amber-400"
                      : "text-zinc-500 hover:text-white",
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
                      ? "bg-amber-500 text-black hover:bg-amber-400"
                      : "text-zinc-500 hover:text-white",
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
                    openResourcesId={openResourcesId}
                    onToggleResources={handleToggleResources}
                  />
                </div>

                {/* Right: lesson content panel */}
                <LessonContentPanel
                  course={course}
                  module={selectedModule}
                  lesson={selectedLesson}
                  isDone={isDone}
                  onToggleLesson={toggle}
                  overallPct={overallPct}
                  completedCount={completedCount}
                  totalLessons={totalLessons}
                />
              </div>
            ) : (
              <FlowView onLockClick={() => setUpgradeOpen(true)} />
            )}
          </div>

          {/* Instructor footer inside shell */}
          <div className="border-t border-zinc-800 px-6 py-5 md:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-lg font-black text-black">
                {course.creator.name[0]}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  Course creator
                </p>
                <h3 className="text-base font-bold text-white">
                  {course.creator.name}
                </h3>
                <p className="text-sm font-medium text-amber-400">
                  {course.creator.role}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  {course.creator.bio}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800/50 py-8 text-center">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-1.5 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span>Made with</span>
            <Heart className="h-3 w-3 fill-rose-600 text-rose-600" />
            <span>by</span>
            <span className="font-semibold text-zinc-400">LessonMap</span>
            <span>·</span>
            <span>Syntaxio Technologies</span>
          </div>
          <p className="text-xs text-zinc-700">
            © <CurrentYear /> Syntaxio Technologies. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

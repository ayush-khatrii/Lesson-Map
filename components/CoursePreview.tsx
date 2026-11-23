"use client";

import { LessonTime, TotalTime } from "@/components/LessonTiming";
import type { LessonTiming } from "@/lib/lesson-time";
import { trackCourseEvent } from "@/components/PublicCourseActions";
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useId,
  type ComponentProps,
} from "react";
import Link from "next/link";
import {
  LazyCourseFlowView,
  FlowViewSwitcher,
  FlowAccessDialog,
} from "@/components/flow/FlowViewControls";

import type { LucideIcon } from "lucide-react";
import {
  Check,
  CheckCircle2,
  Circle,
  Share2,
  Layers,
  List,
  Heart,
  Trophy,
  BookOpen,
  FileText,
  FileType,
  FileSpreadsheet,
  Link2,
  Newspaper,
  ExternalLink,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export type ResourceType =
  "Code" | "PDF" | "Link" | "Note" | "Image" | "Document" | "Spreadsheet";

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  meta?: string | null;
  url?: string;
  content?: string | null;
}

export interface Lesson extends LessonTiming {
  id: string;
  title: string;
  description?: string | null;
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

export interface SocialLink {
  key: "instagram" | "linkedin" | "youtube" | "github" | "twitter" | "website";
  label: string;
  url: string;
}

export interface Creator {
  name: string;
  avatar: string | null;
  role?: string;
  bio?: string;
  socials?: SocialLink[];
}

export interface CourseStats {
  modules: number;
  lessons: number;
  hours?: string;
  students?: string;
}

export interface Course {
  hideBranding?: boolean;
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
  Code: { icon: FileText, label: "Code", color: "text-primary-text" },
  PDF: { icon: FileText, label: "PDF", color: "text-destructive" },
  Link: { icon: Link2, label: "Link", color: "text-chart-2" },
  Note: { icon: Newspaper, label: "Note", color: "text-primary-text" },
  Image: { icon: FileText, label: "Image", color: "text-chart-4" },
  Document: { icon: FileType, label: "Document", color: "text-chart-2" },
  Spreadsheet: {
    icon: FileSpreadsheet,
    label: "Spreadsheet",
    color: "text-chart-4",
  },
};

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

// ─── Share bar ────────────────────────────────────────────────────────────────

// There is deliberately no header on the public page: the only chrome is a
// single button that copies this course's public URL.
function ShareBar() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be blocked in insecure contexts.
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl justify-end px-4 pt-5 sm:px-6 lg:px-8">
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        className="gap-2 rounded-xl border-border bg-background font-semibold"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" /> Link copied
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5" /> Share
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Social links ─────────────────────────────────────────────────────────────

const SOCIAL_ICONS: Record<SocialLink["key"], LucideIcon> = {
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
  twitter: Twitter,
  website: Globe,
};

function SocialLinks({ socials }: { socials: SocialLink[] }) {
  if (socials.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {socials.map((social) => {
        const Icon = SOCIAL_ICONS[social.key] ?? Globe;
        return (
          <a
            key={social.key}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            title={social.label}
            aria-label={social.label}
            className="group flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary-text"
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{social.label}</span>
          </a>
        );
      })}
    </div>
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
          <Icon className="h-4 w-4 text-primary-text" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-none text-foreground">
            {value}
          </p>
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
      onClick={() => {
        if (
          ["Image", "PDF", "Link", "Document", "Spreadsheet"].includes(
            resource.type,
          ) &&
          resource.url
        ) {
          try {
            const url = new URL(resource.url, window.location.origin);
            if (url.protocol === "https:" || url.protocol === "http:") {
              window.open(url.href, "_blank", "noopener,noreferrer");
            }
          } catch {
            // Malformed legacy URLs cannot be opened.
          }
          return;
        }
        onPreview(resource);
      }}
      className="group grid min-w-0 w-full grid-cols-[1.75rem_minmax(0,1fr)] select-text items-start gap-x-2 gap-y-1.5 rounded-xl border border-border bg-card/60 p-2.5 text-left transition-colors hover:border-primary/25 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:gap-x-3 sm:p-3"
      aria-label={`${resource.type === "Document" || resource.type === "Spreadsheet" ? "Download" : "View"} ${resource.title}`}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/80 sm:h-8 sm:w-8",
          meta.color,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-xs">
          {resource.title}
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {resource.meta || meta.label}
        </p>
      </div>
      <span className="col-start-2 inline-flex min-h-7 max-w-full w-fit items-center gap-1 rounded-md border border-border bg-background/60 px-2 text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-primary-text sm:col-start-3 sm:row-start-1 sm:self-center">
        {resource.type === "Document" || resource.type === "Spreadsheet"
          ? "Download"
          : "View"}
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
    <Dialog
      open={Boolean(resource)}
      onOpenChange={(open) => !open && onClose()}
    >
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
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary-text hover:text-primary-text"
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
      className="divide-y divide-border"
    >
      {modules.map((mod, mi) => {
        const { completed, total, pct } = moduleProgress(mod, isDone);
        const isComplete = pct === 100;
        const isStarted = pct > 0 && pct < 100;

        return (
          <AccordionItem key={mod.id} value={mod.id} className="border-0">
            <AccordionTrigger className="rounded-none border-b border-transparent bg-muted/50 px-4 py-4 hover:bg-accent hover:no-underline focus-visible:ring-inset data-[state=open]:border-border data-[state=open]:bg-primary/5">
              <div className="flex w-full min-w-0 items-start gap-2 pr-1 sm:items-center sm:gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    isComplete
                      ? "border border-primary/30 bg-primary/10 text-primary-text"
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
                        ? "text-primary-text"
                        : isStarted
                          ? "text-primary-text"
                          : "text-muted-foreground",
                    )}
                  >
                    {mod.label}
                  </p>
                  <p className="break-words text-xs font-semibold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-sm">
                    {mod.title}
                    <TotalTime lessons={mod.lessons} />
                  </p>
                  <p className="mt-1.5 text-xs font-normal text-muted-foreground">
                    {completed} of {total} {total === 1 ? "lesson" : "lessons"}{" "}
                    complete
                  </p>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="p-0">
              <div className="divide-y divide-border/80">
                {mod.lessons.map((lesson, li) => {
                  const done = isDone(lesson.id);
                  const selected = selectedLessonId === lesson.id;
                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        "flex items-start gap-1 border-l-[3px] px-2 transition-colors",
                        selected
                          ? "border-l-primary bg-primary/10"
                          : "border-l-transparent hover:bg-accent/60",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleLesson(lesson.id)}
                        className="mt-2 flex size-9 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Mark ${lesson.title} ${done ? "incomplete" : "complete"}`}
                        aria-pressed={done}
                      >
                        {done ? (
                          <CheckCircle2 className="size-4 text-primary-text" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-current={selected ? "step" : undefined}
                        onClick={clickUnlessSelecting(() =>
                          onSelectLesson(mod.id, lesson.id),
                        )}
                        className="min-w-0 flex-1 select-text rounded-md px-1 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <span
                          className={cn(
                            "block break-words text-sm leading-relaxed [overflow-wrap:anywhere]",
                            selected
                              ? "font-semibold text-foreground"
                              : done
                                ? "font-medium text-muted-foreground line-through"
                                : "font-medium text-foreground",
                          )}
                        >
                          <span className="mr-1.5 text-xs tabular-nums text-muted-foreground">
                            {li + 1}.{" "}
                          </span>
                          {lesson.title}
                          <LessonTime lesson={lesson} />
                        </span>
                      </button>
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

// Reveal the current lesson within this scroller, without moving the page or
// the other reader panel. The drawer remounts this when it opens.
function CurriculumNavigation({
  inDrawer = false,
  ...props
}: ComponentProps<typeof ModuleSidebar> & { inDrawer?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = scroller.current;
    if (!container || !props.selectedLessonId) return;
    const reveal = () => {
      const current = container.querySelector<HTMLElement>(
        '[aria-current="step"]',
      );
      if (!current) return;
      const outer = container.getBoundingClientRect();
      const row = current.getBoundingClientRect();
      if (row.top < outer.top) container.scrollTop += row.top - outer.top - 8;
      else if (row.bottom > outer.bottom)
        container.scrollTop += row.bottom - outer.bottom + 8;
    };
    const frame = requestAnimationFrame(reveal);
    // Accordion expansion changes the row position throughout its animation.
    const observer = new ResizeObserver(reveal);
    const accordion = container.firstElementChild;
    if (accordion) observer.observe(accordion);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [props.selectedLessonId, props.openModuleId]);
  const count = props.modules.reduce(
    (sum, module) => sum + module.lessons.length,
    0,
  );
  return (
    <nav
      aria-label="Course curriculum"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-card",
        !inDrawer && "rounded-2xl border border-border",
      )}
    >
      {!inDrawer && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-4">
          <h3 className="text-sm font-semibold">Modules &amp; lessons</h3>
          <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {count} lessons
          </span>
        </div>
      )}
      <div
        ref={scroller}
        tabIndex={0}
        aria-label="Modules and lessons list"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [scrollbar-gutter:stable]"
      >
        {props.modules.length ? (
          <ModuleSidebar {...props} />
        ) : (
          <p className="p-4 text-sm text-muted-foreground">No modules yet.</p>
        )}
      </div>
    </nav>
  );
}

// ─── Main Content Panel ───────────────────────────────────────────────────────

function LessonContentPanel({
  courseTitle,
  module,
  lesson,
  isDone,
  onToggleLesson,
  contained = false,
  selectionVersion = 0,
  headingRef,
}: {
  courseTitle: string;
  module: Module | null;
  lesson: Lesson | null;
  isDone: (id: string) => boolean;
  onToggleLesson: (id: string) => void;
  contained?: boolean;
  selectionVersion?: number;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [tab, setTab] = useState<"lesson" | "resources">("lesson");
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  useEffect(() => {
    setTab("lesson");
    setPreviewResource(null);
    bodyRef.current?.scrollTo({ top: 0 });
  }, [lesson?.id, selectionVersion]);

  if (!module || !lesson) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center",
          contained
            ? "min-h-[300px] lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain"
            : "min-h-[420px]",
        )}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <BookOpen className="h-7 w-7 text-primary-text" />
        </div>
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="mb-2 scroll-mt-24 break-words text-lg font-bold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-xl"
        >
          Welcome to {courseTitle}
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-muted-foreground">
          Select a lesson to begin. Your progress is saved locally in your
          browser — pick up where you left off anytime.
        </p>
      </div>
    );
  }

  const done = isDone(lesson.id);
  const description = lesson.description?.trim();
  const resources = lesson.resources ?? [];
  const paragraphs = description ? description.split(/\n{2,}/) : [];

  return (
    <>
      <section
        aria-labelledby={headingId}
        className={cn(
          "flex min-w-0 flex-col rounded-2xl border border-border bg-card",
          contained
            ? "min-h-[300px] lg:h-full lg:min-h-0 lg:overflow-hidden"
            : "min-h-[420px]",
        )}
      >
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary-text">
            {module.label}
          </p>
          <h2
            ref={headingRef}
            id={headingId}
            tabIndex={-1}
            className="scroll-mt-24 break-words text-lg font-bold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-xl"
          >
            {lesson.title}
            <LessonTime lesson={lesson} />
          </h2>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as "lesson" | "resources");
            bodyRef.current?.scrollTo({ top: 0 });
          }}
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-0",
            contained && "lg:min-h-0",
          )}
        >
          <div className="min-w-0 shrink-0 border-b border-border bg-muted/20 px-4 py-3 sm:px-6">
            <TabsList>
              <TabsTrigger
                value="lesson"
                className="text-muted-foreground data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground"
              >
                Lesson
              </TabsTrigger>
              <TabsTrigger
                value="resources"
                className="text-muted-foreground data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground"
              >
                Resources
                {resources.length > 0 && (
                  <span className="ml-1 text-[10px] font-bold tabular-nums opacity-80">
                    {resources.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div
            ref={bodyRef}
            className={cn(
              "min-w-0 flex-1",
              contained &&
                "lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-gutter:stable]",
            )}
          >
            <TabsContent
              value="lesson"
              className="min-w-0 px-3 py-4 sm:px-6 sm:py-5"
            >
              {paragraphs.length > 0 ? (
                <div className="space-y-3">
                  {paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card/60 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">
                    This lesson has no notes yet.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    The course author has only added a title. Check the
                    resources tab for attached material.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="resources"
              className="min-w-0 px-3 py-4 sm:px-6 sm:py-5"
            >
              {resources.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {resources.map((r) => (
                    <ResourceRow
                      key={r.id}
                      resource={r}
                      onPreview={setPreviewResource}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card/60 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No resources attached
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    This lesson does not have any files, links, or notes yet.
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
          <Button
            className={cn(
              "w-full gap-2 font-semibold",
              done
                ? "border border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
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
      </section>
      <ResourcePreviewDialog
        resource={previewResource}
        onClose={() => setPreviewResource(null)}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ViewMode = "accordion" | "flow";

export default function LessonMapPublicPage({
  course: rawCourse = SAMPLE_COURSE,
  slug,
  canUseFlow = false,
  isOwner = false,
  initialLessonId,
}: {
  course?: Course;
  slug?: string;
  canUseFlow?: boolean;
  isOwner?: boolean;
  initialLessonId?: string;
}) {
  const course = useMemo(
    () =>
      rawCourse === SAMPLE_COURSE
        ? enrichCourseWithMockResources(rawCourse)
        : rawCourse,
    [rawCourse],
  );
  const courseId = slug ?? course.id ?? "default-course";

  const { isDone, toggle, completedCount, markStarted } =
    useLessonProgress(courseId, course.modules.flatMap((module) => module.lessons.filter((lesson) => lesson.done).map((lesson) => lesson.id)));

  const [view, setView] = useState<ViewMode>("accordion");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [openModuleId, setOpenModuleId] = useState(
    course.modules.find((m) => m.lessons.some((l) => l.id === initialLessonId))
      ?.id ??
      course.modules[0]?.id ??
      "",
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    initialLessonId ?? null,
  );

  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const readerRef = useRef<HTMLDivElement>(null);
  const lessonHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusLessonAfterClose = useRef(false);
  const didAlignInitialLesson = useRef(false);
  const isListView = view === "accordion" || !canUseFlow;

  const alignReader = useCallback(() => {
    const target = window.matchMedia("(min-width: 1024px)").matches
      ? readerRef.current
      : lessonHeadingRef.current;
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) {
        focusLessonAfterClose.current = false;
        setCurriculumOpen(false);
      }
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (
      !initialLessonId ||
      !isListView ||
      didAlignInitialLesson.current
    )
      return;
    const frame = requestAnimationFrame(() => {
      alignReader();
      didAlignInitialLesson.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [initialLessonId, isListView, alignReader]);

  useEffect(() => {
    if (slug && selectedLessonId && !isOwner) trackCourseEvent(slug, "start");
    if (selectedLessonId) markStarted(selectedLessonId);
  }, [slug, selectedLessonId, isOwner, markStarted]);

  const flowOutline = useMemo(
    () => ({
      id: course.id ?? courseId,
      title: course.title,
      modules: course.modules,
    }),
    [course, courseId],
  );

  const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);
  const overallPct =
    totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

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
      setSelectionVersion((value) => value + 1);
      if (isListView) {
        if (curriculumOpen) {
          focusLessonAfterClose.current = true;
          setCurriculumOpen(false);
        } else requestAnimationFrame(alignReader);
      }
    },
    [isListView, curriculumOpen, alignReader],
  );

  const curriculumProps = {
    modules: course.modules,
    isDone,
    onToggleLesson: toggle,
    selectedLessonId,
    onSelectLesson: handleSelectLesson,
    openModuleId,
    onOpenModule: setOpenModuleId,
  };
  const selectedPosition = selectedLessonId
    ? course.modules
        .flatMap((module) => module.lessons)
        .findIndex((lesson) => lesson.id === selectedLessonId) + 1
    : 0;

  return (
    <div
      data-course-reader-page
      className={cn(
        "min-h-screen bg-background text-foreground",
        SELECTABLE_TEXT,
      )}
    >
      <ShareBar />
      <FlowAccessDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        isOwner={isOwner}
        creatorName={course.creator.name}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        {/* ── Dashboard shell (wireframe container) ── */}
        <div>
          {/* Header strip */}
          <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-6 md:px-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-primary/25 bg-primary/10 text-xs font-bold uppercase tracking-wide text-primary-text">
                Public Course
              </Badge>
            </div>
            <h1 className="break-words text-lg font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-2xl md:text-3xl">
              {course.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
            {course.audience && (
              <p className="mt-2 text-sm text-muted-foreground">
                For: {course.audience}
              </p>
            )}
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 gap-3 border-b border-border py-5">
            <StatCard
              icon={Layers}
              value={course.stats.modules}
              label="Modules"
            />
            <StatCard
              icon={BookOpen}
              value={course.stats.lessons}
              label="Lessons"
            />
            <div className="col-span-2 px-4 sm:px-6">
              <TotalTime lessons={course.modules.flatMap((module) => module.lessons)} />
            </div>
          </div>

          {/* Progress bar */}
          <div className="border-b border-border px-6 py-4 md:px-8">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">
                Your progress
              </span>
              <span className="font-bold text-primary-text">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="mt-2 h-2 bg-secondary" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {completedCount} of {totalLessons} lessons · saved to your account
            </p>
          </div>

          {/* View toggle + two-column body */}
          <div
            ref={readerRef}
            className={cn(
              "scroll-mt-4 py-6",
              isListView &&
                "lg:flex lg:h-[calc(100dvh-2rem)] lg:min-h-0 lg:flex-col lg:py-0 lg:my-6",
            )}
          >
            <div className="mb-5 shrink-0 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-foreground">
                Course curriculum
              </h2>
              <FlowViewSwitcher
                view={canUseFlow ? view : "accordion"}
                onChange={setView}
                canUseFlow={canUseFlow}
                onLocked={() => setUpgradeOpen(true)}
              />
            </div>

            {isListView ? (
              <>
                <Sheet open={curriculumOpen} onOpenChange={setCurriculumOpen}>
                  <div className="sticky top-0 z-20 mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/95 px-3 py-3 backdrop-blur lg:hidden">
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-2"
                      >
                        <List className="size-4" />
                        Curriculum
                      </Button>
                    </SheetTrigger>
                    <span className="min-w-0 text-right text-xs text-muted-foreground">
                      {selectedPosition
                        ? `Lesson ${selectedPosition} of ${totalLessons}`
                        : `${totalLessons} lessons`}
                    </span>
                  </div>
                  <SheetContent
                    side="left"
                    className="h-dvh w-[calc(100vw-2rem)] max-w-sm gap-0 overflow-hidden p-0 [&>button]:grid [&>button]:size-10 [&>button]:place-items-center"
                    onCloseAutoFocus={(event) => {
                      if (focusLessonAfterClose.current) {
                        event.preventDefault();
                        focusLessonAfterClose.current = false;
                        alignReader();
                        lessonHeadingRef.current?.focus({
                          preventScroll: true,
                        });
                      } else if (
                        window.matchMedia("(min-width: 1024px)").matches
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <SheetHeader className="shrink-0 border-b border-border pr-12">
                      <SheetTitle>Modules &amp; lessons</SheetTitle>
                      <SheetDescription>
                        {course.modules.length} modules · {totalLessons} lessons
                      </SheetDescription>
                    </SheetHeader>
                    <CurriculumNavigation {...curriculumProps} inDrawer />
                  </SheetContent>
                </Sheet>
                <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
                  <div className="hidden min-h-0 lg:flex">
                    <CurriculumNavigation {...curriculumProps} />
                  </div>
                  <LessonContentPanel
                    courseTitle={course.title}
                    module={selectedModule}
                    lesson={selectedLesson}
                    isDone={isDone}
                    onToggleLesson={toggle}
                    contained
                    selectionVersion={selectionVersion}
                    headingRef={lessonHeadingRef}
                  />
                </div>
              </>
            ) : (
              <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
                <LazyCourseFlowView
                  outline={flowOutline}
                  watermarked={!course.hideBranding}
                  selectedLessonId={selectedLessonId}
                  isDone={isDone}
                  onSelectLesson={handleSelectLesson}
                />
                <LessonContentPanel
                  courseTitle={course.title}
                  module={selectedModule}
                  lesson={selectedLesson}
                  isDone={isDone}
                  onToggleLesson={toggle}
                />
              </div>
            )}
          </div>

          {/* Instructor footer inside shell — the only place the creator appears */}
          <div className="border-t border-border px-6 py-5 md:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">
                {course.creator.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Course creator
                </p>
                <h3 className="text-base font-bold text-foreground">
                  {course.creator.name}
                </h3>
                {course.creator.role && (
                  <p className="text-sm font-medium text-primary-text">
                    {course.creator.role}
                  </p>
                )}
                {course.creator.bio && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {course.creator.bio}
                  </p>
                )}
                <SocialLinks socials={course.creator.socials ?? []} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {!course.hideBranding && (
        <footer className="border-t border-border py-8 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Made with</span>
              <Heart className="h-3 w-3 fill-destructive text-destructive" />
              <span>by</span>
              <span className="font-semibold text-muted-foreground">
                LessonMap
              </span>
              <span>·</span>
              {/* <span>Stacex Technologies</span> */}
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Stacex Technologies. All rights
              reserved.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

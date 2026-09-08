"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Eye,
  Plus,
  Search,
  Sparkles,
  ChevronRight,
  Layers,
  ArrowLeft,
  GraduationCap,
  X,
} from "lucide-react";
import Link from "next/link";
import { exampleCourses } from "@/constants";

// ── Helpers ──────────────────────────────────────────────────────────────────
function courseHue(id: string | number): number {
  const str = String(id);
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffff;
  return h % 360;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExampleCourse {
  id: string | number;
  title: string;
  description: string;
  outline?: string[];
  category?: string;
  level?: string;
}

// ── Preview Dialog ─────────────────────────────────────────────────────────
function PreviewDialog({
  course,
  open,
  onClose,
}: {
  course: ExampleCourse | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!course) return null;
  const hue = courseHue(course.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-1rem)] max-w-lg flex-col overflow-hidden rounded-2xl p-0"
      >
        {/* Colored header band */}
        <div
          className="px-6 pt-6 pb-5"
          style={{ background: `hsl(${hue} 48% 50% / 0.12)` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: `hsl(${hue} 52% 52%)` }}
            >
              {course.title.charAt(0)}
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7 flex-shrink-0 -mt-0.5 -mr-1">
                <X className="w-3.5 h-3.5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="mt-3 space-y-1 text-left">
            <DialogTitle className="text-lg font-bold leading-snug">
              {course.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {course.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-3">
            {course.category && (
              <Badge variant="secondary" className="text-xs">{course.category}</Badge>
            )}
            {course.level && (
              <Badge variant="outline" className="text-xs">{course.level}</Badge>
            )}
            <Badge variant="outline" className="text-xs gap-1">
              <Layers className="w-2.5 h-2.5" />
              {course.outline?.length ?? 0} topics
            </Badge>
          </div>
        </div>

        {/* Outline list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Course Outline
          </p>
          <div className="space-y-2 pr-1">
            {course.outline?.map((topic, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: `hsl(${hue} 52% 52%)` }}
                >
                  {i + 1}
                </div>
                <p className="text-sm leading-snug">{topic}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator />
        <div className="flex flex-col-reverse gap-2 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Close</Button>
          </DialogClose>
          <Button size="sm" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Use This Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Course Card ──────────────────────────────────────────────────────────────
function CourseCard({
  course,
  index,
  onPreview,
}: {
  course: ExampleCourse;
  index: number;
  onPreview: (course: ExampleCourse) => void;
}) {
  const hue = courseHue(course.id);

  return (
    <div
      className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Top color band */}
      <div
        className="h-1.5 w-full"
        style={{ background: `hsl(${hue} 52% 55%)` }}
      />

      <div className="px-5 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
            style={{ background: `hsl(${hue} 52% 52%)` }}
          >
            {course.title.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base leading-snug line-clamp-1">
              {course.title}
            </h2>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {course.description}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {course.category && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {course.category}
            </Badge>
          )}
          {course.level && (
            <Badge variant="outline" className="text-[10px] h-5">
              {course.level}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] h-5 gap-1">
            <BookOpen className="w-2.5 h-2.5" />
            {course.outline?.length ?? 0} topics
          </Badge>
        </div>

        {/* Outline preview */}
        {course.outline && course.outline.length > 0 && (
          <div className="space-y-1.5 mb-1">
            {course.outline.slice(0, 3).map((topic, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ background: `hsl(${hue} 52% 60%)` }}
                />
                <p className="text-xs text-muted-foreground leading-snug line-clamp-1">
                  {topic}
                </p>
              </div>
            ))}
            {course.outline.length > 3 && (
              <p className="text-[10px] text-muted-foreground/60 pl-3.5 italic">
                +{course.outline.length - 3} more topics
              </p>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Footer actions */}
      <div className="px-5 py-3.5 flex items-center justify-between bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
          onClick={() => onPreview(course)}
        >
          <Eye className="w-3.5 h-3.5" /> Preview
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-xs h-8"
          asChild
        >
          <Link href="/dashboard/create/new">
            Use Template <ChevronRight className="w-3 h-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const ExamplePage = () => {
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<ExampleCourse | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filtered = (exampleCourses as ExampleCourse[]).filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handlePreview = (course: ExampleCourse) => {
    setPreview(course);
    setPreviewOpen(true);
  };

  return (
    <div className="min-h-screen mt-10 bg-background text-foreground">
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative rounded-2xl border border-border bg-card overflow-hidden px-6 md:px-12 py-10 text-center">
          {/* Grid bg */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right,hsl(var(--foreground)) 1px,transparent 1px)," +
                "linear-gradient(to bottom,hsl(var(--foreground)) 1px,transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* Radial glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary)/0.10) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10">
            <Badge variant="secondary" className="rounded-full px-4 py-1 text-xs gap-1.5 mb-4">
              <GraduationCap className="w-3 h-3" /> Ready-to-use Templates
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Start Faster with a Template
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto mb-6 leading-relaxed">
              Browse professionally structured course outlines. Pick one that fits your topic, customize it, and start teaching — in minutes.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="pl-9 h-10 text-sm rounded-xl bg-background"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Count strip ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">All Templates</h2>
            <Badge variant="secondary" className="text-xs">
              {filtered.length}
            </Badge>
          </div>
          {search && (
            <p className="text-xs text-muted-foreground">
              Showing results for <span className="font-medium text-foreground">"{search}"</span>
            </p>
          )}
        </div>

        {/* ── Grid ────────────────────────────────────────────────────── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course, i) => (
              <CourseCard
                key={course.id}
                course={course}
                index={i}
                onPreview={handlePreview}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-muted-foreground opacity-40" />
            </div>
            <p className="font-semibold text-base mb-1">No templates found</p>
            <p className="text-xs text-muted-foreground mb-4">
              No results for "{search}". Try a different keyword.
            </p>
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              Clear Search
            </Button>
          </div>
        )}

        {/* ── Bottom CTA ──────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-8 py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5 text-primary opacity-70" />
            </div>
            <p className="font-semibold mb-1">Don't see what you need?</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
              Build your own course outline from scratch — or let AI generate a first draft for you.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                <Link href="/dashboard/create/new">
                  <Plus className="w-3.5 h-3.5" /> Blank Course
                </Link>
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" asChild>
                <Link href="/dashboard/create/new">
                  <Sparkles className="w-3.5 h-3.5" /> AI Generate
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ── Preview dialog ───────────────────────────────────────────── */}
      <PreviewDialog
        course={preview}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
};

export default ExamplePage;

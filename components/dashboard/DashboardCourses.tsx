"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Copy,
  Edit3,
  Eye,
  FileText,
  Globe,
  GraduationCap,
  Layers,
  Loader2,
  PenLine,
  Plus,
  Sparkles,
  ChevronRight,
  Clock,
  Trash2,
} from "lucide-react";

type Lesson = {
  id: string;
  lessonName: string;
  order: number;
  moduleId: string;
  createdAt: string;
  updatedAt: string;
};

type Module = {
  id: string;
  description: string;
  moduleName: string;
  order: number;
  courseId: string;
  Lesson: Lesson[];
  createdAt: string;
  updatedAt: string;
};

export type CourseWithRelations = {
  id: string;
  courseName: string;
  description: string;
  userId: string;
  Module: Module[];
  createdAt: string;
  updatedAt: string;
  shareSlug: string | null;
  isPublic: boolean;
};

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getPublicUrl(shareSlug: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/p/${shareSlug}`;
  }
  return `/p/${shareSlug}`;
}

async function fetchCourses(): Promise<CourseWithRelations[]> {
  const res = await fetch("/api/course");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load courses");
  return data;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="relative mb-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <GraduationCap className="h-10 w-10 text-primary opacity-80" />
        </div>
        <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <h3 className="mb-2 text-xl font-bold text-foreground">No courses yet</h3>
      <p className="mb-6 max-w-xs text-sm leading-relaxed text-muted-foreground">
        Create your first course outline and start mapping lessons with
        AI-assisted structuring.
      </p>
      <Button className="gap-2" asChild>
        <Link href="/dashboard/create/new">
          <Plus className="w-4 h-4" /> Create Your First Course
        </Link>
      </Button>
    </div>
  );
}

function CourseAccordionItem({
  course,
  index,
  currentUserId,
  onPublish,
  onDelete,
  publishPending,
  deletePending,
}: {
  course: CourseWithRelations;
  index: number;
  currentUserId: string;
  onPublish: (courseId: string, publish: boolean) => void;
  onDelete: (courseId: string) => void;
  publishPending: boolean;
  deletePending: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isOwner = course.userId === currentUserId;
  const canPublish = isOwner && course.Module.length > 0;
  const totalLessons = course.Module.reduce(
    (acc, m) => acc + m.Lesson.length,
    0,
  );
  const completionPct =
    course.Module.length > 0
      ? Math.round((totalLessons / Math.max(course.Module.length * 3, 1)) * 100)
      : 0;
  const publicUrl = course.shareSlug ? getPublicUrl(course.shareSlug) : "";

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Share link copied!");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <AccordionItem
      value={course.id}
      className="group overflow-hidden rounded-2xl border border-border transition-all duration-300 data-[state=open]:border-primary/30"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <AccordionTrigger className="w-full px-6 py-5 text-left transition-colors hover:bg-accent/50 hover:no-underline [&>svg]:hidden [&[data-state=open]]:bg-primary/[0.03]">
        <div className="flex items-center gap-4 w-full">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-sm font-bold text-muted-foreground">
            {course.courseName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="max-w-xs truncate text-base font-semibold leading-snug text-foreground">
                {course.courseName}
              </h2>
              {course.Module.length === 0 && (
                <Badge
                  variant="outline"
                  className="border-border text-[10px] text-muted-foreground"
                >
                  Draft
                </Badge>
              )}
              {course.isPublic && (
                <Badge className="h-5 border-0 bg-primary/15 text-[10px] text-primary">
                  <Globe className="mr-1 h-3 w-3" />
                  Public
                </Badge>
              )}
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {course.description || "No description"}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 flex-shrink-0 mr-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers className="w-3.5 h-3.5" />
              {course.Module.length} modules
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              {totalLessons} lessons
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo(course.updatedAt)}
            </span>
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-6 pb-6">
        <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${Math.min(completionPct, 100)}%` }}
          />
        </div>

        {isOwner && (
          <div className="mb-5 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Public sharing
                </span>
                {course.Module.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    · add a module first
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {publishPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
                <Switch
                  size="sm"
                  checked={course.isPublic}
                  disabled={!canPublish || publishPending}
                  onCheckedChange={(checked) => onPublish(course.id, checked)}
                />
              </div>
            </div>

            {course.isPublic && course.shareSlug && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Input
                  readOnly
                  value={publicUrl}
                  className="h-8 min-w-0 flex-1 text-xs text-muted-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={handleCopy}
                >
                  <Copy className="h-3 w-3" /> Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  asChild
                >
                  <Link href={`/p/${course.shareSlug}`} target="_blank">
                    <Eye className="h-3 w-3" /> View
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold"
            asChild
          >
            <Link href={`/dashboard/${course.id}/edit`}>
              <Edit3 className="w-3.5 h-3.5" /> Edit Course
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            asChild
          >
            <Link href={`/p/${course.shareSlug ?? course.id}`}>
              <Eye className="w-3.5 h-3.5" /> View Outline
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href={`/dashboard/${course.id}/edit`}>
              <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Assist
            </Link>
          </Button>

          {isOwner && (
            <div className="ml-auto">
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete "{course.courseName}"?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this course outline and all
                      its modules and lessons. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      disabled={deletePending}
                      onClick={(e) => {
                        e.preventDefault();
                        onDelete(course.id);
                        setDeleteOpen(false);
                      }}
                    >
                      {deletePending ? "Deleting..." : "Delete Course"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {course.Module.length > 0 ? (
          <Accordion type="multiple" className="space-y-2.5">
            {course.Module.sort((a, b) => a.order - b.order).map(
              (module, idx) => (
                <AccordionItem
                  key={module.id}
                  value={module.id}
                  className="overflow-hidden rounded-xl border border-border bg-muted/30"
                >
                  <AccordionTrigger className="px-4 py-3 transition-colors hover:bg-accent/50 hover:no-underline [&>svg]:hidden">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-xs font-bold text-muted-foreground">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {module.moduleName}
                        </p>
                        {module.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {module.description}
                          </p>
                        )}
                      </div>

                      <div className="mr-1 flex shrink-0 items-center gap-2">
                        <Badge
                          variant="outline"
                          className="h-5 border-border text-[10px] text-muted-foreground"
                        >
                          {module.Lesson.length}{" "}
                          {module.Lesson.length === 1 ? "lesson" : "lessons"}
                        </Badge>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4">
                    <Separator className="mb-3 bg-border/50" />
                    {module.Lesson.length > 0 ? (
                      <div className="space-y-1.5">
                        {module.Lesson.sort(
                          (a, b) => (a.order || 0) - (b.order || 0),
                        ).map((lesson, lessonIdx) => (
                          <div
                            key={lesson.id}
                            className="group/lesson flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 transition-all hover:border-border"
                          >
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border text-[10px] font-semibold text-muted-foreground">
                              {lessonIdx + 1}
                            </div>

                            <p className="flex-1 text-sm font-medium leading-snug text-foreground">
                              {lesson.lessonName || `Lesson ${lessonIdx + 1}`}
                            </p>

                            <PenLine className="h-3.5 w-3.5 text-transparent transition-colors group-hover/lesson:text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-5 text-center text-muted-foreground">
                        <FileText className="mx-auto mb-1.5 h-5 w-5 opacity-40" />
                        <p className="text-xs">No lessons added yet</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                          asChild
                        >
                          <Link href={`/dashboard/${course.id}/edit`}>
                            <Plus className="w-3 h-3" /> Add lessons
                          </Link>
                        </Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ),
            )}
          </Accordion>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/60">
              <Layers className="h-5 w-5 text-muted-foreground opacity-60" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No modules yet
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Start building your course structure
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              asChild
            >
              <Link href={`/dashboard/${course.id}/edit`}>
                <Plus className="w-3.5 h-3.5" /> Add First Module
              </Link>
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function DashboardCourses({
  initialCourses,
  currentUserId,
}: {
  initialCourses: CourseWithRelations[];
  currentUserId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  const { data: courses = initialCourses } = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
    initialData: initialCourses,
  });

  const publishMutation = useMutation({
    mutationFn: async ({
      courseId,
      publish,
    }: {
      courseId: string;
      publish: boolean;
    }) => {
      setPendingCourseId(courseId);
      const res = await fetch(`/api/course/${courseId}/publish`, {
        method: publish ? "POST" : "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update sharing");
      return { courseId, ...data };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<CourseWithRelations[]>(["courses"], (old) =>
        (old ?? []).map((c) =>
          c.id === data.courseId
            ? {
                ...c,
                isPublic: data.isPublic,
                shareSlug: data.shareSlug ?? c.shareSlug,
              }
            : c,
        ),
      );
      if (data.isPublic) {
        toast.success("Course is now public!");
      } else {
        toast.success("Course is now private");
      }
      router.refresh();
    },
    onError: (err) => {
      toast.error((err as Error).message);
    },
    onSettled: () => {
      setPendingCourseId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      setDeletingCourseId(courseId);
      const res = await fetch(`/api/course/${courseId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete course");
      return courseId;
    },
    onSuccess: (courseId) => {
      queryClient.setQueryData<CourseWithRelations[]>(["courses"], (old) =>
        (old ?? []).filter((c) => c.id !== courseId),
      );
      toast.success("Course deleted");
      router.refresh();
    },
    onError: (err) => {
      toast.error((err as Error).message);
    },
    onSettled: () => {
      setDeletingCourseId(null);
    },
  });

  if (courses.length === 0) {
    return <EmptyState />;
  }

  return (
    <Accordion type="multiple" className="space-y-3">
      {courses.map((course, index) => (
        <CourseAccordionItem
          key={course.id}
          course={course}
          index={index}
          currentUserId={currentUserId}
          publishPending={pendingCourseId === course.id}
          deletePending={deletingCourseId === course.id}
          onPublish={(courseId, publish) =>
            publishMutation.mutate({ courseId, publish })
          }
          onDelete={(courseId) => deleteMutation.mutate(courseId)}
        />
      ))}
    </Accordion>
  );
}

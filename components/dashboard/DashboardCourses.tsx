"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  LazyCourseFlowView,
  FlowViewSwitcher,
  FlowAccessDialog,
  type OutlineView,
} from "@/components/flow/FlowViewControls";
import { useSubscriptionPlan } from "@/lib/flow/useSubscriptionPlan";
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-background">
        <GraduationCap aria-hidden="true" className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">Your workspace starts here</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
        Use New Course or AI Generate above to map your first learning journey.
      </p>
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
  canUseFlow,
  isPlanLoading,
}: {
  course: CourseWithRelations;
  index: number;
  currentUserId: string;
  onPublish: (courseId: string, publish: boolean) => void;
  onDelete: (courseId: string) => void;
  publishPending: boolean;
  deletePending: boolean;
  canUseFlow: boolean;
  isPlanLoading: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<OutlineView>("accordion");
  const [flowAccessOpen, setFlowAccessOpen] = useState(false);
  const outline = useMemo(
    () => ({
      id: course.id,
      title: course.courseName,
      modules: [...course.Module]
        .sort((a, b) => a.order - b.order)
        .map((mod) => ({
          id: mod.id,
          title: mod.moduleName,
          lessons: [...mod.Lesson]
            .sort((a, b) => a.order - b.order)
            .map((lesson) => ({ id: lesson.id, title: lesson.lessonName })),
        })),
    }),
    [course],
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isOwner = course.userId === currentUserId;
  const canPublish = isOwner && course.Module.length > 0;
  const totalLessons = course.Module.reduce(
    (acc, m) => acc + m.Lesson.length,
    0,
  );
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
      className="group/course overflow-hidden rounded-xl border border-border bg-card transition-colors duration-200 motion-reduce:transition-none last:border-b data-[state=open]:border-primary/30"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <AccordionTrigger className="px-4 py-4 text-left hover:bg-muted/40 hover:no-underline sm:px-5 [&>svg]:hidden">
        <div className="flex w-full min-w-0 items-start gap-3 sm:items-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-sm font-medium text-muted-foreground">
            {course.courseName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="break-words text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-base">
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
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {course.description || "No description"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground xl:hidden">
              <span>
                {course.Module.length}{" "}
                {course.Module.length === 1 ? "module" : "modules"}
              </span>
              <span>
                {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
              </span>
              <span>Updated {timeAgo(course.updatedAt)}</span>
            </div>
          </div>

          <div className="mr-2 hidden shrink-0 items-center gap-3 xl:flex">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers className="w-3.5 h-3.5" />
              {course.Module.length}{" "}
              {course.Module.length === 1 ? "module" : "modules"}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo(course.updatedAt)}
            </span>
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/course:rotate-90" />
        </div>
      </AccordionTrigger>

      <AccordionContent className="border-t border-border bg-muted/20 px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-5">
        {isOwner && (
          <div className="mb-4 rounded-lg border border-border bg-background/60 px-3 py-3">
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
                  aria-label={`Public sharing for ${course.courseName}`}
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
                  aria-label="Public course link"
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
            <Link
              href={`/p/${
                course.isPublic && course.shareSlug
                  ? course.shareSlug
                  : course.id
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> View Outline
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href={`/dashboard/${course.id}/edit#ai-assist`}>
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
                    aria-label={`Delete ${course.courseName}`}
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

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Course curriculum</h3>
          <FlowViewSwitcher
            view={canUseFlow ? view : "accordion"}
            onChange={setView}
            canUseFlow={canUseFlow}
            isLoading={isPlanLoading}
            onLocked={() => setFlowAccessOpen(true)}
          />
        </div>
        <FlowAccessDialog
          open={flowAccessOpen}
          onOpenChange={setFlowAccessOpen}
        />
        {view === "flow" && canUseFlow ? (
          <LazyCourseFlowView
            outline={outline}
            onSelectLesson={(_, lessonId) =>
              router.push(
                `/p/${course.id}?lesson=${encodeURIComponent(lessonId)}`,
              )
            }
          />
        ) : course.Module.length > 0 ? (
          <Accordion type="multiple" className="space-y-2.5">
            {[...course.Module]
              .sort((a, b) => a.order - b.order)
              .map((module, idx) => (
                <AccordionItem
                  key={module.id}
                  value={module.id}
                  className="group/module overflow-hidden rounded-lg border border-border bg-card last:border-b"
                >
                  <AccordionTrigger className="px-4 py-3 transition-colors hover:bg-accent/50 hover:no-underline [&>svg]:hidden">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-xs font-bold text-muted-foreground">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <p className="break-words text-sm font-medium leading-snug text-foreground [overflow-wrap:anywhere]">
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
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/module:rotate-90" />
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4">
                    <Separator className="mb-3 bg-border/50" />
                    {module.Lesson.length > 0 ? (
                      <div className="space-y-1.5">
                        {[...module.Lesson]
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((lesson, lessonIdx) => (
                            <div
                              key={lesson.id}
                              className="group/lesson flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
                            >
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium text-muted-foreground">
                                {lessonIdx + 1}
                              </div>

                              <p className="min-w-0 flex-1 break-words text-sm leading-snug text-foreground [overflow-wrap:anywhere]">
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
              ))}
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
  const { canUseFlow, isLoading: isPlanLoading } =
    useSubscriptionPlan(currentUserId);
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
          canUseFlow={canUseFlow}
          isPlanLoading={isPlanLoading}
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { MAX_AI_OUTLINE_ITEMS, reviseCourseSchema, type AiPlan } from "@/lib/ai/schema";
import { AI_CLIENT_TIMEOUT_MS } from "@/lib/ai/timing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Allowance = {
  plan: AiPlan;
  limits: { modules: number | null; lessonsPerModule: number | null; monthlyAttempts: number };
  remaining: number;
  resetsAt: string;
  enabled: boolean;
};

// Ready-made prompts so creators can edit an existing course without writing a
// long brief from scratch.
const IDEAS = [
  "Make the whole course more beginner-friendly",
  "Add more hands-on, practical lessons",
  "Refresh every lesson title to sound clearer",
  "Tighten each module description to be more concrete",
  "Reorder modules for a smoother learning progression",
  "Add more real-world examples to the lessons",
];

function clamp(value: number, limit: number | null) {
  const fallback = Number.isFinite(value) ? value : 1;
  const max = limit === null ? MAX_AI_OUTLINE_ITEMS : limit;
  return Math.min(Math.max(Math.round(fallback), 1), max);
}

export function AiCourseEditor({
  open,
  onOpenChange,
  courseId,
  courseName,
  defaultModuleCount,
  defaultLessonsPerModule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  defaultModuleCount: number;
  defaultLessonsPerModule: number;
}) {
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [loading, setLoading] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [moduleCount, setModuleCount] = useState(String(defaultModuleCount));
  const [lessonsPerModule, setLessonsPerModule] = useState(String(defaultLessonsPerModule));
  const [rewriteMeta, setRewriteMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<{ fingerprint: string; id: string } | null>(null);

  const loadAllowance = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/generate", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check AI availability.");
      const next = data as Allowance;
      setAllowance(next);
      setModuleCount(String(clamp(defaultModuleCount, next.limits.modules)));
      setLessonsPerModule(String(clamp(defaultLessonsPerModule, next.limits.lessonsPerModule)));
    } catch (loadError) {
      if (!signal?.aborted) {
        setAllowance(null);
        setError(loadError instanceof Error ? loadError.message : "Could not check AI availability.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [defaultModuleCount, defaultLessonsPerModule]);

  useEffect(() => {
    if (!open) return;
    setInstructions("");
    setError("");
    setRewriteMeta(false);
    request.current = null;
    const controller = new AbortController();
    void loadAllowance(controller.signal);
    return () => controller.abort();
  }, [open, loadAllowance]);

  const isFree = allowance?.plan === "FREE";

  // Clear the deep-link hash when closing so a reload does not reopen the dialog.
  const closeDialog = useCallback((next: boolean) => {
    onOpenChange(next);
    if (!next && window.location.hash === "#ai-assist") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [onOpenChange]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !allowance) return;

    const payload = {
      courseId,
      instructions: instructions.trim(),
      moduleCount: Number(moduleCount),
      lessonsPerModule: Number(lessonsPerModule),
      rewriteMeta,
    };
    const fingerprint = JSON.stringify(payload);
    // Reuse the same request id across retries so the server can detect replays.
    if (request.current?.fingerprint !== fingerprint) {
      request.current = { fingerprint, id: crypto.randomUUID() };
    }
    const parsed = reviseCourseSchema.safeParse({ ...payload, requestId: request.current.id });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/ai/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.timeout(AI_CLIENT_TIMEOUT_MS),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.newRequest) request.current = null;
        throw new Error(result.error || "AI could not update your course. Please try again.");
      }
      closeDialog(false);
      toast.success("AI updated your course. Reloading the outline…");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (submitError) {
      setError(
        submitError instanceof Error && submitError.name !== "TimeoutError"
          ? submitError.message
          : "The request timed out. Retry with the same instructions to check for your changes.",
      );
      await loadAllowance();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Wand2 className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>Edit this course with AI</DialogTitle>
          <DialogDescription>
            Describe how to change <span className="font-medium text-foreground">{courseName}</span> and
            AI will rewrite the course outline for you. This edits the existing course — it does not create a new one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={submitting}>
          <div className="space-y-2">
            <Label>Quick ideas</Label>
            <div className="flex flex-wrap gap-1.5">
              {IDEAS.map((idea) => (
                <Button
                  key={idea}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full px-2.5 text-[11px] font-normal"
                  disabled={submitting}
                  onClick={() => {
                    setInstructions(idea);
                    request.current = null;
                    setError("");
                  }}
                >
                  {idea}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ai-edit-instructions">What should AI change?</Label>
            <Textarea
              id="ai-edit-instructions"
              required
              minLength={3}
              maxLength={1000}
              placeholder="e.g. Regenerate lesson titles for a complete beginner and add a module on practice projects."
              value={instructions}
              onChange={(event) => { setInstructions(event.target.value); request.current = null; setError(""); }}
              className="min-h-24"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-edit-modules">Number of modules</Label>
              <Input
                id="ai-edit-modules"
                type="number"
                required
                min={1}
                max={allowance?.limits.modules ?? MAX_AI_OUTLINE_ITEMS}
                step={1}
                disabled={isFree || submitting}
                value={moduleCount}
                onChange={(event) => { setModuleCount(event.target.value); request.current = null; setError(""); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-edit-lessons">Lessons in each module</Label>
              <Input
                id="ai-edit-lessons"
                type="number"
                required
                min={1}
                max={allowance?.limits.lessonsPerModule ?? MAX_AI_OUTLINE_ITEMS}
                step={1}
                disabled={isFree || submitting}
                value={lessonsPerModule}
                onChange={(event) => { setLessonsPerModule(event.target.value); request.current = null; setError(""); }}
              />
            </div>
          </div>

          {allowance && !isFree && <p className="text-xs text-muted-foreground">One AI edit can create up to {MAX_AI_OUTLINE_ITEMS} total modules and lessons — for example, 25 modules with 5 lessons each.</p>}
          {submitting && <p role="status" className="text-sm text-muted-foreground">Updating your outline. Large courses can take up to five minutes.</p>}

          <div className="flex items-center justify-between gap-4 rounded-xl border bg-background p-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">Also rewrite the title and description</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {rewriteMeta
                  ? "AI may rename the course and rewrite its description."
                  : "The course title and description stay as they are."}
              </p>
            </div>
            <Switch
              checked={rewriteMeta}
              disabled={submitting}
              onCheckedChange={(checked) => { setRewriteMeta(checked); request.current = null; setError(""); }}
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              AI replaces the current modules and lessons. Resources attached to lessons are
              removed too. Only run this on a draft you are happy to regenerate.
            </p>
          </div>

          {isFree && (
            <p className="text-sm text-muted-foreground">
              Free AI keeps one module and one lesson per edit.{" "}
              <Link href="/pricing" className="text-primary underline">Upgrade to Creator</Link> for full courses.
            </p>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Checking your AI allowance…"
                : allowance
                  ? `${allowance.remaining} of ${allowance.limits.monthlyAttempts} AI generations left this month.`
                  : ""}
            </p>
            {allowance && !allowance.enabled && <Badge variant="secondary">AI unavailable</Badge>}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => closeDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={submitting || loading || !allowance?.enabled || allowance?.remaining === 0}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {submitting ? "Updating course…" : "Apply with AI"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

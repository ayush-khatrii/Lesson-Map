"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { generateCourseSchema, MAX_AI_OUTLINE_ITEMS, type AiPlan } from "@/lib/ai/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Allowance = {
  plan: AiPlan;
  limits: { modules: number | null; lessonsPerModule: number | null; monthlyAttempts: number };
  remaining: number;
  resetsAt: string;
  enabled: boolean;
};

export function AiCourseGenerator({ disabled, onGeneratingChange }: {
  disabled: boolean;
  onGeneratingChange: (generating: boolean) => void;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [moduleCount, setModuleCount] = useState("6");
  const [lessonsPerModule, setLessonsPerModule] = useState("3");
  const [generating, setGenerating] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const busy = useRef(false);
  const previousRequest = useRef<{ fingerprint: string; id: string } | null>(null);

  const loadAllowance = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/generate", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check AI availability.");
      const next = data as Allowance;
      setAllowance(next);
      setModuleCount((value) => String(next.limits.modules === null
        ? Number(value) || 1
        : Math.min(Number(value) || 1, next.limits.modules)));
      setLessonsPerModule((value) => String(next.limits.lessonsPerModule === null
        ? Number(value) || 1
        : Math.min(Number(value) || 1, next.limits.lessonsPerModule)));
    } catch (error) {
      if (!signal?.aborted) {
        setAllowance(null);
        setError(error instanceof Error ? error.message : "Could not check AI availability.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setAllowance(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void loadAllowance(controller.signal);
    return () => controller.abort();
  }, [session?.user?.id, isPending, loadAllowance]);

  function changed() {
    previousRequest.current = null;
    setCanRetry(false);
    setError("");
  }

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || disabled || !allowance) return;
    const requirements = { type: "course", topic: topic.trim(), audience: audience.trim(),
      moduleCount: Number(moduleCount), lessonsPerModule: Number(lessonsPerModule) };
    const fingerprint = JSON.stringify(requirements);
    if (previousRequest.current?.fingerprint !== fingerprint) {
      previousRequest.current = { fingerprint, id: crypto.randomUUID() };
    }
    const parsed = generateCourseSchema.safeParse({ ...requirements, requestId: previousRequest.current.id });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    busy.current = true;
    setGenerating(true);
    onGeneratingChange(true);
    setError("");
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.timeout(65_000),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.newRequest) previousRequest.current = null;
        throw new Error(result.error || "Generation failed. Please try again.");
      }
      const { courseId } = z.object({ courseId: z.string().min(1) }).parse(result);
      setCreatedCourseId(courseId);
      toast.success("Your private course draft is ready. Review it before publishing.");
      router.push(`/dashboard/${encodeURIComponent(courseId)}/edit`);
      router.refresh();
    } catch (error) {
      setCanRetry(previousRequest.current !== null);
      setError(error instanceof Error && error.name !== "TimeoutError"
        ? error.message
        : "The request timed out. Retry with the same details to check for your course.");
      await loadAllowance();
    } finally {
      busy.current = false;
      setGenerating(false);
      onGeneratingChange(false);
    }
  }

  const isFree = allowance?.plan === "FREE";

  return (
    <Card className="mb-6 border-primary/25 bg-primary/[0.03] shadow-none" id="ai-course">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Create a course with AI</h2>
          {allowance && <Badge variant="secondary">{isFree ? "Free starter" : "Creator full course"}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Tell us what you want to teach and who it is for. AI will create a private
          draft with a course description, modules, and lesson titles for you to edit.
        </p>
      </CardHeader>
      <CardContent>
        {loading && !generating ? <p role="status" className="text-sm text-muted-foreground">Checking your AI allowance…</p> :
          !session?.user ? <Button asChild variant="outline"><Link href="/sign-in">Sign in to generate</Link></Button> :
          createdCourseId ? <Button asChild><Link href={`/dashboard/${encodeURIComponent(createdCourseId)}/edit`}>Open generated course</Link></Button> :
          <form onSubmit={handleGenerate} className="space-y-4" aria-busy={generating}>
            <fieldset disabled={disabled || generating} className="space-y-4 disabled:opacity-70">
              <div className="space-y-1.5">
                <Label htmlFor="ai-topic">What will you teach?</Label>
                <Textarea id="ai-topic" placeholder="JavaScript for beginners" required minLength={3} maxLength={500}
                  value={topic} onChange={(event) => { setTopic(event.target.value); changed(); }} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-audience">Who is this course for?</Label>
                <Input id="ai-audience" placeholder="New developers with no programming experience" required minLength={3} maxLength={200}
                  value={audience} onChange={(event) => { setAudience(event.target.value); changed(); }} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-modules">Number of modules</Label>
                  <Input id="ai-modules" type="number" required min={1} max={allowance?.limits.modules ?? MAX_AI_OUTLINE_ITEMS} step={1}
                    disabled={isFree} value={moduleCount} onChange={(event) => { setModuleCount(event.target.value); changed(); }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-lessons">Lessons in each module</Label>
                  <Input id="ai-lessons" type="number" required min={1} max={allowance?.limits.lessonsPerModule ?? MAX_AI_OUTLINE_ITEMS} step={1}
                    disabled={isFree} value={lessonsPerModule} onChange={(event) => { setLessonsPerModule(event.target.value); changed(); }} />
                </div>
              </div>
              {isFree && <p className="text-sm text-muted-foreground">Free generates 1 course, 1 module, and 1 lesson. <Link href="/pricing" className="text-primary underline">Upgrade to Creator</Link> to choose a larger outline.</p>}
              {allowance && !isFree && <p className="text-xs text-muted-foreground">Your course has no module or lesson cap. For reliable output, one AI attempt can create up to {MAX_AI_OUTLINE_ITEMS} total modules and lessons; add as many as you want manually afterward.</p>}
              <p className="text-sm">1 course · {moduleCount || 0} modules · {(Number(moduleCount) || 0) * (Number(lessonsPerModule) || 0)} lessons total</p>
              <p className="text-xs text-muted-foreground">Your topic and audience are sent to DeepSeek. Review the generated outline before publishing.</p>
              <Button type="submit" disabled={!allowance?.enabled || !allowance || (!canRetry && allowance.remaining === 0)} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Creating your course…" : canRetry ? "Retry / check course" : "Generate & create private course"}
              </Button>
            </fieldset>
            {generating && <p role="status" className="text-sm text-muted-foreground">Building your outline and saving the draft. This can take up to a minute.</p>}
            {allowance && <p className="text-xs text-muted-foreground">{allowance.remaining} of {allowance.limits.monthlyAttempts} AI attempts left this month. Resets {new Date(allowance.resetsAt).toLocaleDateString()}. Attempts that reach AI count even if generation fails.</p>}
            {allowance && !allowance.enabled && <p className="text-sm text-muted-foreground">AI generation is not available yet. You can still create a course manually below.</p>}
          </form>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {!loading && !allowance && session?.user && <Button variant="outline" className="mt-3" onClick={() => { setError(""); void loadAllowance(); }}>Retry availability check</Button>}
      </CardContent>
    </Card>
  );
}

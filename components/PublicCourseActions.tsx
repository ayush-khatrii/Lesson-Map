"use client";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";

export function trackCourseEvent(slug: string, kind: "visit" | "start" | "paid_course_click") {
  try {
    let sessionId = sessionStorage.getItem("lessonmap-visitor");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("lessonmap-visitor", sessionId);
    }
    const sentKey = `lessonmap-event:${slug}:${kind}`;
    if (sessionStorage.getItem(sentKey)) return;
    void fetch(`/api/public/${encodeURIComponent(slug)}/events`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, kind }),
    })
      .then((response) => {
        if (response.ok) sessionStorage.setItem(sentKey, "1");
      })
      .catch(() => {});
  } catch {
    /* Session storage is optional. */
  }
}

export default function PublicCourseActions({
  slug,
  isOwner,
  emailCapture,
  mainOrigin,
  isSignedIn = false,
}: {
  slug: string;
  isOwner: boolean;
  emailCapture: boolean;
  mainOrigin: string;
  isSignedIn?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupError, setSignupError] = useState("");
  const emailId = useId();
  useEffect(() => {
    if (!isOwner) trackCourseEvent(slug, "visit");
  }, [slug, isOwner]);
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      {!isSignedIn && (
        <p className="text-sm text-muted-foreground">
          <a
            className="underline"
            href={`${mainOrigin}/sign-in?callbackUrl=${encodeURIComponent(`/p/${slug}`)}`}
          >
            Sign in on LessonMap
          </a>{" "}
          to save your progress across devices.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {emailCapture && (
          <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Mail aria-hidden="true" className="size-4 text-primary-text" />
                {signedUp ? "You're signed up" : "Stay in touch"}
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-6 rounded-2xl p-6 pr-6 shadow-2xl sm:max-w-md sm:p-8 sm:pr-8">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary-text">
                {signedUp ? (
                  <Check aria-hidden="true" className="size-6" />
                ) : (
                  <Mail aria-hidden="true" className="size-6" />
                )}
              </div>
              <DialogHeader className="gap-3 text-left">
                <DialogTitle className="pr-4 text-2xl font-semibold leading-tight tracking-tight">
                  {signedUp ? "You're on the list." : "Stay in touch with the creator"}
                </DialogTitle>
                <DialogDescription className="leading-relaxed">
                  {signedUp
                    ? "Your email has been shared with this course’s creator so they can contact you about this course."
                    : "Enjoying this roadmap? Leave your email so the creator can keep you informed about this course."}
                </DialogDescription>
              </DialogHeader>
              {signedUp ? (
                <div className="space-y-5">
                  <p role="status" className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                    Thanks for connecting. You can get back to learning.
                  </p>
                  <DialogClose asChild>
                    <Button className="w-full">Continue learning</Button>
                  </DialogClose>
                </div>
              ) : (
                <form
                  className="space-y-5"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (submitting) return;
                    const form = new FormData(event.currentTarget);
                    setSubmitting(true);
                    setSignupError("");
                    try {
                      const response = await fetch(
                        `/api/public/${encodeURIComponent(slug)}/leads`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            email: form.get("email"),
                            consent: form.get("consent") === "on",
                            website: form.get("website"),
                          }),
                        },
                      );
                      const result = await response.json();
                      if (!response.ok) throw new Error(result.error || "Could not sign up. Please try again.");
                      setSignedUp(true);
                    } catch (error) {
                      setSignupError(
                        error instanceof Error ? error.message : "Could not sign up. Please try again.",
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  <fieldset disabled={submitting} className="min-w-0 space-y-5">
                    <div className="space-y-2">
                      <label htmlFor={emailId} className="text-sm font-medium">
                        Email address
                      </label>
                      <Input
                        id={emailId}
                        name="email"
                        type="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        placeholder="you@example.com"
                        maxLength={254}
                        aria-describedby={signupError ? `${emailId}-error` : undefined}
                        className="h-11 bg-background"
                      />
                    </div>
                    <input
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="hidden"
                    />
                    <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted-foreground">
                      <input
                        name="consent"
                        type="checkbox"
                        required
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span>
                        I agree to share my email with this course’s creator so
                        they can contact me about this course. I can ask the
                        creator to remove it.
                      </span>
                    </label>
                    {signupError && (
                      <p id={`${emailId}-error`} role="alert" className="text-sm text-destructive">
                        {signupError}
                      </p>
                    )}
                    <Button type="submit" disabled={submitting} className="h-11 w-full gap-2">
                      {submitting ? (
                        <><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Signing up…</>
                      ) : (
                        <>Keep me updated <ArrowRight aria-hidden="true" className="size-4" /></>
                      )}
                    </Button>
                  </fieldset>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost" className="w-full text-muted-foreground">
                      Maybe later
                    </Button>
                  </DialogClose>
                </form>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

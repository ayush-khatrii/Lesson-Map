"use client";
import { useSession } from "@/lib/auth-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function trackCourseEvent(slug: string, kind: "visit" | "start") {
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
  cloneRequested = false,
}: {
  slug: string;
  isOwner: boolean;
  emailCapture: boolean;
  mainOrigin: string;
  cloneRequested?: boolean;
}) {
  const { data: session, isPending } = useSession();
  const [cloning, setCloning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const cloneRoadmap = useCallback(async () => {
    if (window.location.origin !== mainOrigin) {
      window.location.assign(
        `${mainOrigin}/p/${encodeURIComponent(slug)}?clone=1`,
      );
      return;
    }
    setCloning(true);
    try {
      const response = await fetch(
        `/api/public/${encodeURIComponent(slug)}/clone`,
        { method: "POST" },
      );
      if (response.status === 401) {
        window.location.assign(
          `/sign-in?callbackUrl=${encodeURIComponent(`/p/${slug}?clone=1`)}`,
        );
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(`/outline/${result.courseId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not clone roadmap.",
      );
    } finally {
      setCloning(false);
    }
  }, [mainOrigin, slug]);
  const resumedClone = useRef(false);
  useEffect(() => {
    if (
      !cloneRequested ||
      !session ||
      resumedClone.current ||
      window.location.origin !== mainOrigin
    )
      return;
    resumedClone.current = true;
    window.history.replaceState(null, "", `/p/${encodeURIComponent(slug)}`);
    void cloneRoadmap();
  }, [cloneRequested, session, mainOrigin, slug, cloneRoadmap]);
  useEffect(() => {
    if (!isOwner) trackCourseEvent(slug, "visit");
  }, [slug, isOwner]);
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      {!isPending && !session && (
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
      <Button variant="outline" disabled={cloning} onClick={cloneRoadmap}>
        {cloning ? "Copying…" : "Use this roadmap"}
      </Button>
      {emailCapture &&
        (signedUp ? (
          <p role="status">
            Thanks! Your email has been shared with the creator.
          </p>
        ) : (
          <form
            className="max-w-lg space-y-3 rounded-xl border p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (submitting) return;
              const form = new FormData(event.currentTarget);
              setSubmitting(true);
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
                if (!response.ok) throw new Error(result.error);
                setSignedUp(true);
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Signup failed.",
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <h2 className="font-semibold">Stay in touch with the creator</h2>
            <Input
              name="email"
              type="email"
              aria-label="Your email"
              required
              placeholder="you@example.com"
              maxLength={254}
            />
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
            <label className="flex items-start gap-2 text-sm">
              <input name="consent" type="checkbox" required className="mt-1" />
              I agree to share my email with this course’s creator so they can
              contact me about this course. I can ask the creator to remove it.
            </label>
            <Button disabled={submitting}>
              {submitting ? "Signing up…" : "Sign up"}
            </Button>
          </form>
        ))}
    </div>
  );
}

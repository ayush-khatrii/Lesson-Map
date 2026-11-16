"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

// Progress comes only from the database. Old localStorage data is left untouched.
export function useLessonProgress(courseId: string) {
  const { data: session, isPending } = useSession();
  const userId = session?.user.id;
  const identity = `${userId ?? "guest"}:${courseId}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const [state, setState] = useState<{
    identity: string;
    completed: Set<string>;
  }>({ identity: "", completed: new Set() });
  const [loadedIdentity, setLoadedIdentity] = useState("");
  const pending = useRef(new Set<string>());
  const completed =
    state.identity === identity ? state.completed : new Set<string>();
  const hydrated = !isPending && (!userId || loadedIdentity === identity);
  const endpoint = `/api/progress/${encodeURIComponent(courseId)}`;

  useEffect(() => {
    if (isPending || !userId) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            "Could not load your saved progress. Reload to try again.",
          );
        const result = (await response.json()) as {
          progress: { lessonId: string; completedAt: string | null }[];
        };
        if (!controller.signal.aborted) {
          setState({
            identity,
            completed: new Set(
              result.progress
                .filter((row) => row.completedAt)
                .map((row) => row.lessonId),
            ),
          });
          setLoadedIdentity(identity);
        }
      } catch (error) {
        if (!controller.signal.aborted)
          toast.error(
            error instanceof Error ? error.message : "Could not load progress.",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [identity, endpoint, userId, isPending]);

  const save = useCallback(
    async (lessonId: string, done?: boolean) => {
      if (!userId) {
        if (done !== undefined)
          toast.info("Sign in to save your lesson progress.");
        return;
      }
      if (!hydrated) {
        if (done !== undefined)
          toast.info("Wait for your saved progress to load.");
        return;
      }
      const key = `${identity}:${lessonId}:${done === undefined ? "start" : "complete"}`;
      if (pending.current.has(key)) return;
      pending.current.add(key);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            ...(done === undefined ? {} : { completed: done }),
          }),
        });
        if (!response.ok)
          throw new Error("Could not save your progress. Please try again.");
        if (done !== undefined && currentIdentity.current === identity)
          setState((previous) => {
            const ids = new Set(
              previous.identity === identity ? previous.completed : [],
            );
            if (done) ids.add(lessonId);
            else ids.delete(lessonId);
            return { identity, completed: ids };
          });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save progress.",
        );
      } finally {
        pending.current.delete(key);
      }
    },
    [userId, hydrated, identity, endpoint],
  );

  const toggle = useCallback(
    (lessonId: string) => {
      void save(lessonId, !completed.has(lessonId));
    },
    [save, completed],
  );
  const markStarted = useCallback(
    (lessonId: string) => {
      void save(lessonId);
    },
    [save],
  );
  const isDone = useCallback(
    (lessonId: string) => completed.has(lessonId),
    [completed],
  );
  return {
    completed,
    toggle,
    isDone,
    hydrated,
    markStarted,
    completedCount: completed.size,
    isSignedIn: Boolean(userId),
  };
}

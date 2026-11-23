"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

// The page supplies saved progress once. Authentication is checked by the API
// only when a learner starts or completes a lesson, never on a timer or focus.
export function useLessonProgress(courseId: string, initialCompleted: string[] = []) {
  const [completed, setCompleted] = useState(() => new Set(initialCompleted));
  const pending = useRef(new Set<string>());
  const endpoint = `/api/progress/${encodeURIComponent(courseId)}`;

  const save = useCallback(
    async (lessonId: string, done?: boolean) => {
      const key = `${lessonId}:${done === undefined ? "start" : "complete"}`;
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
        if (response.status === 401) {
          setCompleted(new Set());
          if (done !== undefined)
            toast.info("Sign in to save your lesson progress.");
          return;
        }
        if (!response.ok)
          throw new Error("Could not save your progress. Please try again.");
        if (done !== undefined)
          setCompleted((previous) => {
            const ids = new Set(previous);
            if (done) ids.add(lessonId);
            else ids.delete(lessonId);
            return ids;
          });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save progress.",
        );
      } finally {
        pending.current.delete(key);
      }
    },
    [endpoint],
  );

  const toggle = useCallback(
    (lessonId: string) => { void save(lessonId, !completed.has(lessonId)); },
    [save, completed],
  );
  const markStarted = useCallback(
    (lessonId: string) => { void save(lessonId); },
    [save],
  );
  const isDone = useCallback(
    (lessonId: string) => completed.has(lessonId),
    [completed],
  );
  return { completed, toggle, isDone, markStarted, completedCount: completed.size };
}

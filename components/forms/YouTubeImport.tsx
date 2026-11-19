"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Youtube,
  ListVideo,
  BookOpen,
  Check,
  Loader2,
  Link2,
} from "lucide-react";

export default function YouTubeImport({
  onBusyChange,
}: {
  onBusyChange?: (busy: boolean) => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [importError, setImportError] = useState<{
    message: string;
    reference?: string;
  } | null>(null);
  const [attempt, setAttempt] = useState<{ url: string; id: string } | null>(
    null,
  );
  const router = useRouter();
  return (
    <form
      className="grid overflow-hidden rounded-2xl border bg-card lg:grid-cols-[1.3fr_1fr]"
      aria-busy={busy}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setImportError(null);
        setBusy(true);
        onBusyChange?.(true);
        const requestId =
          attempt?.url === url ? attempt.id : crypto.randomUUID();
        setAttempt({ url, id: requestId });
        try {
          const response = await fetch("/api/import/youtube", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, requestId }),
          });
          const result = await response.json().catch(() => null);
          if (!response.ok) {
            const message =
              typeof result?.error === "string" && result.error.trim()
                ? result.error
                : `Import failed (HTTP ${response.status}). Please try again.`;
            setImportError({ message, reference: result?.requestId });
            toast.error(message);
            return;
          }
          if (!result?.courseId)
            throw new Error(
              "The server returned an incomplete import response. Please try again.",
            );
          if (result.skipped)
            toast.info(`Skipped ${result.skipped} unavailable videos.`);
          router.push(`/outline/${result.courseId}`);
          router.refresh();
        } catch (error) {
          const message =
            error instanceof TypeError
              ? "Could not reach LessonMap. Check your connection and try again."
              : error instanceof Error
                ? error.message
                : "Import failed. Please try again.";
          setImportError({ message });
          toast.error(message);
        } finally {
          setBusy(false);
          onBusyChange?.(false);
        }
      }}
    >
      <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-10">
        <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <Youtube className="size-6" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Your playlist. A new way to learn.
        </h2>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">
          Bring your videos together in an editable course. Start with a public
          YouTube playlist, then shape the learning journey.
        </p>
        <div className="mt-8 space-y-3">
          <Label htmlFor="youtube-playlist-url">YouTube playlist link</Label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-4 size-4 text-muted-foreground" />
            <Input
              id="youtube-playlist-url"
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/playlist?list=…"
              disabled={busy}
              className="h-12 min-w-0 pl-10 text-sm"
              aria-describedby={
                importError ? "playlist-help playlist-error" : "playlist-help"
              }
            />
          </div>
          <p
            id="playlist-help"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            Open your playlist on YouTube and copy its link. Make sure the
            playlist is public.
          </p>
        </div>
        {importError && (
          <div
            id="playlist-error"
            role="alert"
            className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
          >
            <p className="font-semibold">Playlist import failed</p>
            <p className="mt-1">{importError.message}</p>
            {importError.reference && (
              <p className="mt-2 break-all text-xs text-muted-foreground">
                Support reference: {importError.reference}
              </p>
            )}
          </div>
        )}
        <Button
          type="submit"
          disabled={busy}
          className="mt-6 h-12 w-full gap-2 sm:w-fit sm:px-6"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ListVideo className="size-4" />
          )}
          {busy ? "Importing your playlist…" : "Import playlist"}
        </Button>
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          {busy
            ? "Collecting your videos and creating your course. This may take a moment."
            : "Free includes one successful import."}
        </p>
      </div>
      <aside className="flex flex-col justify-center border-t bg-muted/30 p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
        <div
          aria-hidden="true"
          className="mb-8 rounded-xl border bg-background p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3 border-b pb-4">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Your next course</p>
              <p className="mt-1 text-xs text-muted-foreground">
                From playlist to learning path
              </p>
            </div>
          </div>
          {[
            "Start with the fundamentals",
            "Build on what you learn",
            "Put it into practice",
          ].map((lesson) => (
            <div
              key={lesson}
              className="mt-2 flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <ListVideo className="size-4 shrink-0 text-primary" />
              <span className="text-sm">{lesson}</span>
            </div>
          ))}
        </div>
        <h3 className="text-base font-semibold">
          A starting point you can make your own
        </h3>
        <ul className="mt-4 space-y-3">
          {[
            "Bring videos into one course",
            "Edit and organize your learning path",
            "Add your own notes and resources",
          ].map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              {benefit}
            </li>
          ))}
        </ul>
      </aside>
    </form>
  );
}

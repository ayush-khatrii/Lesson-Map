"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function YouTubeImport() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<{ url: string; id: string } | null>(
    null,
  );
  const router = useRouter();
  return (
    <form
      className="mb-6 space-y-3 rounded-xl border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        const requestId =
          attempt?.url === url ? attempt.id : crypto.randomUUID();
        setAttempt({ url, id: requestId });
        try {
          const response = await fetch("/api/import/youtube", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, requestId }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          if (result.skipped)
            toast.info(`Skipped ${result.skipped} unavailable videos.`);
          router.push(`/outline/${result.courseId}`);
          router.refresh();
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Import failed. Please try again.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="font-semibold">Import a YouTube playlist</h2>
      <p className="text-sm text-muted-foreground">
        Turn a public playlist into an editable roadmap. Free includes one
        successful import.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="YouTube playlist URL"
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/playlist?list=..."
          disabled={busy}
        />
        <Button disabled={busy}>
          {busy ? "Importing…" : "Import playlist"}
        </Button>
      </div>
    </form>
  );
}

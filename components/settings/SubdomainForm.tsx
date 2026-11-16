"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default function SubdomainForm({
  initialValue,
  canEdit,
}: {
  initialValue: string;
  canEdit: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3 rounded-lg border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const response = await fetch("/api/settings/subdomain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subdomain: value }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          setValue(result.subdomain);
          toast.success("Subdomain saved.");
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not save subdomain.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-sm font-semibold">Your LessonMap address</h2>
      <p className="text-sm text-muted-foreground">
        {canEdit
          ? "Show your public courses at your own address."
          : "Upgrade to Creator to activate your address."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Subdomain"
          className="max-w-xs"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={!canEdit || busy}
          required
          minLength={3}
          maxLength={30}
        />
        <span>.lessonmap.org</span>
        <Button disabled={!canEdit || busy}>{busy ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

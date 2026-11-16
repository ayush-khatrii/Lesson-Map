"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export default function CourseLeads({
  courseId,
  canCapture,
}: {
  courseId: string;
  canCapture: boolean;
}) {
  const [data, setData] = useState<{
    enabled: boolean;
    leads: { email: string; createdAt: string }[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      const response = await fetch(`/api/course/${courseId}/leads`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load leads.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-lg border p-3">
      <Button variant="outline" size="sm" disabled={busy} onClick={load}>
        {busy ? "Loading…" : "Email capture & leads"}
      </Button>
      {data && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.enabled}
              disabled={busy || !canCapture}
              onChange={async (event) => {
                const enabled = event.target.checked;
                setBusy(true);
                try {
                  const response = await fetch(
                    `/api/course/${courseId}/leads`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ enabled }),
                    },
                  );
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error);
                  setData({ ...data, enabled });
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not save setting.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
            Collect emails on the public page (Creator)
          </label>
          <p className="text-sm">
            {data.leads.length} signups ·{" "}
            <a
              className="underline"
              href={`/api/course/${courseId}/leads?format=csv`}
            >
              Download CSV
            </a>
          </p>
          <ul className="max-h-48 overflow-auto text-sm">
            {data.leads.map((lead) => (
              <li key={lead.email} className="break-all">
                {lead.email} · {new Date(lead.createdAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

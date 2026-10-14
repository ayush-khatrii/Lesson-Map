"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDown, Image, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CourseOutline } from "@/lib/flow/graph";
import type { CourseExportData } from "@/lib/export/course-pdf";

type ExportKind = "accordion" | "png" | "pdf";

export function CourseExportTab({
  courseId,
  canUseFlow,
  isPlanLoading,
  outline,
  document,
  creatorName,
}: {
  courseId: string | null;
  canUseFlow: boolean;
  isPlanLoading: boolean;
  outline: CourseOutline;
  document: CourseExportData;
  creatorName: string;
}) {
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const download = async (kind: ExportKind) => {
    if (
      !courseId ||
      exporting ||
      (kind !== "accordion" && (!canUseFlow || isPlanLoading))
    )
      return;
    setExporting(kind);
    try {
      if (kind === "accordion") {
        const { downloadCoursePdf } = await import("@/lib/export/course-pdf");
        await downloadCoursePdf(document);
      } else {
        // Recheck at the action boundary, including after a plan changes in another tab.
        const response = await fetch("/api/subscription/status", {
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error("Could not verify your plan. Please try again.");
        const { plan } = await response.json();
        if (plan !== "CREATOR" && plan !== "PROFESSIONAL")
          throw new Error(
            "Flow exports require an active Creator or Professional plan.",
          );
        const { downloadFlowExport } = await import("@/lib/export/flow-export");
        await downloadFlowExport({ outline, creatorName }, kind, appearance);
      }
      toast.success("Your course export is ready.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Export failed. Please try again.",
      );
    } finally {
      setExporting(null);
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Export your course</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Every export includes the entire course. Flow exports include all
          lessons, even when modules are collapsed.
        </p>
      </div>
      {!courseId && (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Save your course first to enable exports.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h4 className="font-semibold">Accordion outline</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            A structured PDF with every module, lesson, description, and
            resource. Available on all plans.
          </p>
          <Button
            variant="outline"
            className="mt-5 gap-2"
            disabled={!courseId || Boolean(exporting)}
            onClick={() => download("accordion")}
          >
            {exporting === "accordion" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}{" "}
            Download accordion PDF
          </Button>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h4 className="flex items-center gap-2 font-semibold">
            Flow map{" "}
            {!canUseFlow && <Lock className="h-4 w-4 text-muted-foreground" />}
          </h4>
          <p className="mt-2 text-sm text-muted-foreground">
            The complete learning path in a clean, print-friendly layout. Large
            PDFs use multiple pages to keep lessons readable.
          </p>
          <fieldset className="mt-4 space-y-2">
            <legend className="text-sm font-medium">Appearance</legend>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={appearance === mode ? "secondary" : "outline"}
                  aria-pressed={appearance === mode}
                  disabled={Boolean(exporting)}
                  onClick={() => setAppearance(mode)}
                >
                  {mode === "light" ? "Light" : "Dark"}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 flex flex-wrap gap-2">
            {(["png", "pdf"] as const).map((format) => (
              <Button
                key={format}
                variant="outline"
                className="gap-2"
                disabled={
                  !courseId ||
                  Boolean(exporting) ||
                  !canUseFlow ||
                  isPlanLoading
                }
                onClick={() => download(format)}
              >
                {exporting === format ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : format === "png" ? (
                  <Image className="h-4 w-4" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}{" "}
                Download Flow {format.toUpperCase()}
              </Button>
            ))}
          </div>
          {!canUseFlow && !isPlanLoading && (
            <p className="mt-4 text-xs text-muted-foreground">
              Available on Creator and Professional.{" "}
              <Link
                href="/pricing"
                className="font-medium text-primary underline"
              >
                View plans
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

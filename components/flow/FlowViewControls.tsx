"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { List, Lock, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const LazyCourseFlowView = dynamic(() => import("./CourseFlowView"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="flex h-[520px] items-center justify-center rounded-xl border text-sm text-muted-foreground"
    >
      Loading course flow…
    </div>
  ),
});
export type OutlineView = "accordion" | "flow";

export function FlowViewSwitcher({
  view,
  onChange,
  canUseFlow,
  isLoading = false,
  onLocked,
}: {
  view: OutlineView;
  onChange: (view: OutlineView) => void;
  canUseFlow: boolean;
  isLoading?: boolean;
  onLocked: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Curriculum view"
      className="inline-flex shrink-0 gap-1 rounded-xl border border-border bg-muted/50 p-1"
    >
      {(["accordion", "flow"] as const).map((mode) => (
        <Button
          key={mode}
          type="button"
          size="sm"
          variant="ghost"
          aria-pressed={view === mode}
          disabled={mode === "flow" && isLoading}
          onClick={() =>
            mode === "flow" && !canUseFlow ? onLocked() : onChange(mode)
          }
          className={cn(
            "gap-1.5 rounded-lg text-xs",
            view === mode &&
              "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
          )}
        >
          {mode === "accordion" ? (
            <List className="h-3.5 w-3.5" />
          ) : (
            <Workflow className="h-3.5 w-3.5" />
          )}
          {mode === "accordion" ? "List" : "Flow"}
          {mode === "flow" && !canUseFlow && !isLoading && (
            <Lock aria-label="Paid plan required" className="h-3 w-3" />
          )}
        </Button>
      ))}
    </div>
  );
}

export function FlowAccessDialog({
  open,
  onOpenChange,
  isOwner = true,
  creatorName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner?: boolean;
  creatorName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isOwner ? "Unlock Flow view" : "Flow view unavailable"}
          </DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Upgrade to Creator or Professional to explore your outlines as interactive learning paths and share Flow view with your viewers."
              : `Flow view isn’t available for this course because ${creatorName || "the creator"} hasn’t enabled a paid plan.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Continue with List
          </Button>
          {isOwner && (
            <Button asChild>
              <Link href="/pricing">View plans</Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

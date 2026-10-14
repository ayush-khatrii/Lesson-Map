"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { CheckCircle2, ChevronRight, ChevronDown } from "lucide-react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type OutlineNodeData,
} from "@/lib/flow/graph";
import { cn } from "@/lib/utils";

export const OutlineNode = memo(function OutlineNode({
  data,
}: NodeProps<Node<OutlineNodeData>>) {
  const content = (
    <>
      <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-primary">
        {data.label}
        {data.kind === "module" &&
          Boolean(data.lessonCount) &&
          (
            <span className="flex items-center gap-1 normal-case tracking-normal">
              {data.collapsed ? "Expand" : "Collapse"}
              {data.collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </span>
          )}
        {data.completed && (
          <CheckCircle2 aria-label="Completed" className="h-4 w-4" />
        )}
      </span>
      <span
        className={cn(
          "mt-2 block break-words text-sm font-semibold leading-4",
          data.kind === "module" ? "line-clamp-2" : "line-clamp-3",
        )}
      >
        {data.title}
      </span>
      {data.kind === "module" && (
        <span className="mt-1 block text-[10px] text-muted-foreground">
          {data.lessonCount
            ? `${data.lessonCount} lessons${data.completedCount !== undefined ? ` · ${data.completedCount} completed` : ""}`
            : "No lessons"}
        </span>
      )}
    </>
  );
  const classes = cn(
    "h-full w-full rounded-xl border bg-card p-3 text-left text-card-foreground shadow-sm",
    data.selected ? "border-primary ring-2 ring-primary/25" : "border-border",
    data.completed && "bg-primary/10",
  );
  return (
    <div style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}>
      {data.kind !== "course" && (
        <Handle type="target" position={Position.Left} isConnectable={false} />
      )}
      {data.kind === "lesson" ||
      (data.kind === "module" && Boolean(data.lessonCount)) ? (
        <button
          type="button"
          onClick={data.kind === "module" ? data.onToggle : data.onSelect}
          aria-pressed={
            data.kind === "lesson" ? Boolean(data.selected) : undefined
          }
          aria-expanded={data.kind === "module" ? !data.collapsed : undefined}
          aria-label={
            data.kind === "module"
              ? `${data.collapsed ? "Expand" : "Collapse"} ${data.title}`
              : undefined
          }
          title={`${data.collapsed ? "Expand" : "Collapse"} ${data.title}`}
          className={cn(
            classes,
            "nodrag nopan focus-visible:outline-2 focus-visible:outline-primary",
          )}
        >
          {content}
        </button>
      ) : (
        <div title={data.title} className={classes}>
          {content}
        </div>
      )}
      {data.kind !== "lesson" && (
        <Handle type="source" position={Position.Right} isConnectable={false} />
      )}
    </div>
  );
});

"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { CheckCircle2 } from "lucide-react";
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
        {data.completed && (
          <CheckCircle2 aria-label="Completed" className="h-4 w-4" />
        )}
      </span>
      <span className="mt-2 block line-clamp-3 break-words text-sm font-semibold leading-4">
        {data.title}
      </span>
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
      {data.kind === "lesson" ? (
        <button
          type="button"
          onClick={data.onSelect}
          aria-pressed={Boolean(data.selected)}
          title={data.title}
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

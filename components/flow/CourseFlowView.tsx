"use client";

import { useMemo } from "react";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { buildCourseGraph, type CourseOutline } from "@/lib/flow/graph";

import { OutlineNode } from "./OutlineNode";

const nodeTypes = { outline: OutlineNode };

export interface CourseFlowViewProps {
  outline: CourseOutline;
  selectedLessonId?: string | null;
  isDone?: (lessonId: string) => boolean;
  onSelectLesson: (moduleId: string, lessonId: string) => void;
}

export default function CourseFlowView({
  outline,
  selectedLessonId,
  isDone,
  onSelectLesson,
}: CourseFlowViewProps) {
  const { resolvedTheme, forcedTheme } = useTheme();
  const graph = useMemo(() => buildCourseGraph(outline), [outline]);
  const nodes = useMemo(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          selected: node.data.lessonId === selectedLessonId,
          completed: node.data.lessonId ? isDone?.(node.data.lessonId) : false,
          onSelect: node.data.lessonId
            ? () => onSelectLesson(node.data.moduleId!, node.data.lessonId!)
            : undefined,
        },
      })),
    [graph, selectedLessonId, isDone, onSelectLesson],
  );
  return (
    <section
      aria-label="Course flow diagram"
      className="relative h-[520px] w-full min-w-0 overflow-hidden rounded-xl border border-border bg-muted/20 sm:h-[600px]"
    >
      <ReactFlow
        nodes={nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        deleteKeyCode={null}
        nodesFocusable={false}
        edgesFocusable={false}
        colorMode={(forcedTheme ?? resolvedTheme) === "dark" ? "dark" : "light"}
        defaultEdgeOptions={{
          style: { stroke: "var(--primary)", strokeWidth: 1.5 },
        }}
      >
        <Background gap={24} color="var(--border)" />
        <Controls showInteractive={false} />
      </ReactFlow>
      {outline.modules.length === 0 && (
        <p className="pointer-events-none absolute inset-x-4 top-4 rounded-lg bg-card p-3 text-center text-sm text-muted-foreground">
          Add modules to build your learning path.
        </p>
      )}
    </section>
  );
}

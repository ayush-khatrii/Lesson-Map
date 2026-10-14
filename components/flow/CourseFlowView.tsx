"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import {
  buildCourseGraph,
  type CourseOutline,
  type OutlineNodeData,
} from "@/lib/flow/graph";

import { Button } from "@/components/ui/button";
import { OutlineNode } from "./OutlineNode";

const nodeTypes = { outline: OutlineNode };
type FlowNode = Node<OutlineNodeData, "outline">;

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
  const storageKey = `lessonmap-flow-collapsed:${outline.id}`;
  const [collapseState, setCollapseState] = useState<{
    key: string;
    ids: Set<string>;
  }>({ key: storageKey, ids: new Set() });
  const collapsed = useMemo(
    () =>
      collapseState.key === storageKey ? collapseState.ids : new Set<string>(),
    [collapseState, storageKey],
  );
  const flow = useRef<ReactFlowInstance<FlowNode> | null>(null);
  useEffect(() => {
    let ids: string[] = [];
    try {
      const stored: unknown = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "[]",
      );
      if (Array.isArray(stored))
        ids = stored.filter((id): id is string => typeof id === "string");
    } catch {
      /* Storage is optional. */
    }
    const selectedModule = outline.modules.find((module) =>
      module.lessons.some((lesson) => lesson.id === selectedLessonId),
    );
    setCollapseState({
      key: storageKey,
      ids: new Set(ids.filter((id) => id !== selectedModule?.id)),
    });
  }, [storageKey]);
  useEffect(() => {
    if (!selectedLessonId) return;
    const module = outline.modules.find((module) =>
      module.lessons.some((lesson) => lesson.id === selectedLessonId),
    );
    if (module)
      setCollapseState((previous) => {
        if (!previous.ids.has(module.id)) return previous;
        const ids = new Set(previous.ids);
        ids.delete(module.id);
        return { key: storageKey, ids };
      });
  }, [selectedLessonId, storageKey]);
  const graph = useMemo(
    () => buildCourseGraph(outline, collapsed),
    [outline, collapsed],
  );
  const changeCollapsed = (ids: Set<string>, anchorId?: string) => {
    if (anchorId && flow.current) {
      const before = graph.nodes.find(
        (node) => node.id === `module:${anchorId}`,
      );
      const after = buildCourseGraph(outline, ids).nodes.find(
        (node) => node.id === `module:${anchorId}`,
      );
      if (before && after) {
        const viewport = flow.current.getViewport();
        void flow.current.setViewport({
          ...viewport,
          y:
            viewport.y + (before.position.y - after.position.y) * viewport.zoom,
        });
      }
    }
    setCollapseState({ key: storageKey, ids });
    try {
      sessionStorage.setItem(storageKey, JSON.stringify([...ids]));
    } catch {
      /* Storage is optional. */
    }
  };
  const nodes = useMemo<FlowNode[]>(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          completedCount:
            node.data.kind === "module" && isDone
              ? outline.modules
                  .find((module) => module.id === node.data.moduleId)
                  ?.lessons.filter((lesson) => isDone(lesson.id)).length
              : undefined,
          onToggle:
            node.data.kind === "module"
              ? () => {
                  const next = new Set(collapsed);
                  const id = node.data.moduleId!;
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  changeCollapsed(next, id);
                }
              : undefined,
          selected: Boolean(node.data.lessonId) && node.data.lessonId === selectedLessonId,
          completed: node.data.lessonId ? isDone?.(node.data.lessonId) : false,
          onSelect: node.data.lessonId
            ? () => onSelectLesson(node.data.moduleId!, node.data.lessonId!)
            : undefined,
        },
      })),
    [graph, selectedLessonId, isDone, onSelectLesson, collapsed, outline],
  );
  return (
    <section
      aria-label="Course flow diagram"
      className="relative h-[520px] w-full min-w-0 overflow-hidden rounded-xl border border-border bg-muted/20 sm:h-[600px]"
    >
      <ReactFlow<FlowNode>
        onInit={(instance) => {
          flow.current = instance;
        }}
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
        <Panel
          position="top-right"
          className="flex gap-1 rounded-lg border bg-card p-1"
        >
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => changeCollapsed(new Set())}
            disabled={collapsed.size === 0}
          >
            Expand all
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() =>
              changeCollapsed(
                new Set(
                  outline.modules
                    .filter((module) => module.lessons.length)
                    .map((module) => module.id),
                ),
              )
            }
            disabled={
              !outline.modules.some(
                (module) => module.lessons.length && !collapsed.has(module.id),
              )
            }
          >
            Collapse all
          </Button>
        </Panel>
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

export interface CourseOutline {
  id: string;
  title: string;
  modules: {
    id: string;
    title: string;
    lessons: { id: string; title: string }[];
  }[];
}

export interface OutlineNodeData extends Record<string, unknown> {
  title: string;
  label: string;
  kind: "course" | "module" | "lesson";
  moduleId?: string;
  lessonId?: string;
  completed?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  collapsed?: boolean;
  lessonCount?: number;
  completedCount?: number;
  onToggle?: () => void;
}

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 100;
const ROW_GAP = 32;
const COLUMN_STEP = 340;

// Array order is the curriculum order. Layout depends only on structure, never
// selection or progress, so completing a lesson cannot move the canvas.
export function buildCourseGraph(
  outline: CourseOutline,
  collapsedModules: ReadonlySet<string> = new Set(),
  nodeHeight = NODE_HEIGHT,
) {
  const nodes: {
    id: string;
    type: "outline";
    position: { x: number; y: number };
    data: OutlineNodeData;
  }[] = [];
  const edges: {
    id: string;
    source: string;
    target: string;
    type: "smoothstep";
  }[] = [];
  const rootId = `course:${outline.id}`;
  let cursor = 0;
  const connect = (source: string, target: string) => {
    edges.push({
      id: JSON.stringify([source, target]),
      source,
      target,
      type: "smoothstep",
    });
  };
  outline.modules.forEach((module, moduleIndex) => {
    const moduleId = `module:${module.id}`;
    const collapsed = collapsedModules.has(module.id);
    const visibleLessons = collapsed ? [] : module.lessons;
    const height = Math.max(1, visibleLessons.length) * (nodeHeight + ROW_GAP);
    nodes.push({
      id: moduleId,
      type: "outline",
      position: {
        x: COLUMN_STEP,
        y: cursor + (height - nodeHeight - ROW_GAP) / 2,
      },
      data: {
        kind: "module",
        title: module.title,
        label: `Module ${moduleIndex + 1}`,
        moduleId: module.id,
        collapsed,
        lessonCount: module.lessons.length,
      },
    });
    connect(rootId, moduleId);
    visibleLessons.forEach((lesson, lessonIndex) => {
      const lessonId = `lesson:${lesson.id}`;
      nodes.push({
        id: lessonId,
        type: "outline",
        position: {
          x: COLUMN_STEP * 2,
          y: cursor + lessonIndex * (nodeHeight + ROW_GAP),
        },
        data: {
          kind: "lesson",
          title: lesson.title,
          label: `${moduleIndex + 1}.${lessonIndex + 1}`,
          moduleId: module.id,
          lessonId: lesson.id,
        },
      });
      connect(moduleId, lessonId);
    });
    cursor += height + ROW_GAP;
  });
  nodes.unshift({
    id: rootId,
    type: "outline",
    position: {
      x: 0,
      y: Math.max(0, (cursor - nodeHeight - ROW_GAP * 2) / 2),
    },
    data: {
      kind: "course",
      title: outline.title || "Untitled course",
      label: "Course",
    },
  });
  return { nodes, edges };
}

export function hasFlowAccess(plan: string | null | undefined) {
  return plan === "CREATOR" || plan === "PROFESSIONAL";
}

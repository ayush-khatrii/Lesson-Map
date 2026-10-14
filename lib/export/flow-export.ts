import {
  buildCourseGraph,
  NODE_WIDTH,
  NODE_HEIGHT,
  type CourseOutline,
} from "@/lib/flow/graph";

export type FlowExportFormat = "png" | "pdf";
export type FlowExportAppearance = "light" | "dark";
export interface FlowExportData {
  outline: CourseOutline;
  creatorName: string;
}

export interface FlowPdfPage {
  outline: CourseOutline;
  collapsedModules: ReadonlySet<string>;
}

const MAX_SINGLE_PAGE_NODES = 8;
const MODULES_PER_OVERVIEW_PAGE = 4;

// Detail pages repeat the course/module context and preserve original ordering.
// Every lesson appears once in these pages, including modules with no lessons.
export function flowDetailPages(outline: CourseOutline): CourseOutline[] {
  return outline.modules.flatMap((module) => {
    const pages: CourseOutline[] = [];
    for (
      let start = 0;
      start < Math.max(1, module.lessons.length);
      start += 4
    ) {
      pages.push({
        ...outline,
        modules: [
          { ...module, lessons: module.lessons.slice(start, start + 4) },
        ],
      });
    }
    return pages;
  });
}

export function flowPdfPages(outline: CourseOutline): FlowPdfPage[] {
  if (buildCourseGraph(outline).nodes.length <= MAX_SINGLE_PAGE_NODES) {
    return [{ outline, collapsedModules: new Set() }];
  }

  const overviewPages: FlowPdfPage[] = [];
  for (
    let start = 0;
    start < outline.modules.length;
    start += MODULES_PER_OVERVIEW_PAGE
  ) {
    const modules = outline.modules.slice(
      start,
      start + MODULES_PER_OVERVIEW_PAGE,
    );
    overviewPages.push({
      outline: {
        ...outline,
        modules: modules.map((module) => ({ ...module, lessons: [] })),
      },
      collapsedModules: new Set(modules.map((module) => module.id)),
    });
  }

  return [
    ...overviewPages,
    ...flowDetailPages(outline).map((page) => ({
      outline: page,
      collapsedModules: new Set<string>(),
    })),
  ];
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const character of word) {
        if (line && context.measureText(line + character).width > width) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function renderFlowExport(
  data: FlowExportData,
  outline = data.outline,
  collapsedModules: ReadonlySet<string> = new Set(),
  appearance: FlowExportAppearance = "light",
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Your browser could not create the export image.");
  context.font = "600 14px sans-serif";
  const original = buildCourseGraph(data.outline);
  const labels = new Map(
    original.nodes.map((node) => [node.id, node.data.label]),
  );
  const initial = buildCourseGraph(outline);
  const titleLines = new Map(
    initial.nodes.map((node) => [
      node.id,
      wrapText(context, node.data.title, NODE_WIDTH - 28),
    ]),
  );
  const moduleLessonCounts = new Map(
    data.outline.modules.map((module) => [
      module.id,
      module.lessons.length,
    ]),
  );
  const nodeHeight = Math.max(
    NODE_HEIGHT,
    ...[...titleLines.values()].map((lines) => 68 + lines.length * 18),
  );
  const graph = buildCourseGraph(outline, collapsedModules, nodeHeight);
  const padding = 40;
  const width = Math.max(
    1000,
    ...graph.nodes.map((node) => node.position.x + NODE_WIDTH + padding * 2),
  );
  context.font = "600 24px sans-serif";
  const heading = wrapText(
    context,
    data.outline.title || "Untitled course",
    width - padding * 2,
  );
  context.font = "14px sans-serif";
  const creator = wrapText(
    context,
    `Created by ${data.creatorName || "Course creator"}`,
    width - padding * 2,
  );
  const headerHeight = padding + heading.length * 30 + creator.length * 20 + 50;
  const height =
    Math.max(...graph.nodes.map((node) => node.position.y + nodeHeight)) +
    headerHeight +
    padding;
  const colors =
    appearance === "dark"
      ? {
          background: "#111827",
          text: "#f8fafc",
          module: "#1f2937",
          lesson: "#111827",
          border: "#475569",
          edge: "#a5b4fc",
          label: "#c4b5fd",
          secondary: "#cbd5e1",
        }
      : {
          background: "#ffffff",
          text: "#172033",
          module: "#f2f3ff",
          lesson: "#ffffff",
          border: "#cdd1e5",
          edge: "#7779e8",
          label: "#5055c9",
          secondary: "#596579",
        };
  // Bound browser canvas allocation. Never crop or silently omit course nodes.
  const scale = Math.min(
    2,
    16000 / width,
    16000 / height,
    Math.sqrt(32_000_000 / (width * height)),
  );
  if (scale < 0.5)
    throw new Error("This course section is too large to export legibly.");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  context.scale(scale, scale);
  context.fillStyle = colors.background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = colors.text;
  context.font = "600 24px sans-serif";
  heading.forEach((line, index) =>
    context.fillText(line, padding, padding + 24 + index * 30),
  );
  context.font = "14px sans-serif";
  context.fillStyle = colors.secondary;
  creator.forEach((line, index) =>
    context.fillText(
      line,
      padding,
      padding + heading.length * 30 + 24 + index * 20,
    ),
  );
  const lessons = data.outline.modules.reduce(
    (sum, module) => sum + module.lessons.length,
    0,
  );
  context.fillText(
    `${data.outline.modules.length} modules · ${lessons} lessons · Entire course`,
    padding,
    headerHeight - 18,
  );
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  context.strokeStyle = colors.edge;
  context.lineWidth = 1.5;
  for (const edge of graph.edges) {
    const source = nodes.get(edge.source)!;
    const target = nodes.get(edge.target)!;
    const x1 = source.position.x + NODE_WIDTH + padding;
    const y1 = source.position.y + nodeHeight / 2 + headerHeight;
    const x2 = target.position.x + padding;
    const y2 = target.position.y + nodeHeight / 2 + headerHeight;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo((x1 + x2) / 2, y1);
    context.lineTo((x1 + x2) / 2, y2);
    context.lineTo(x2, y2);
    context.stroke();
  }
  for (const node of graph.nodes) {
    const x = node.position.x + padding;
    const y = node.position.y + headerHeight;
    context.fillStyle =
      node.data.kind === "lesson" ? colors.lesson : colors.module;
    context.strokeStyle = colors.border;
    context.beginPath();
    context.roundRect(x, y, NODE_WIDTH, nodeHeight, 12);
    context.fill();
    context.stroke();
    context.font = "600 11px sans-serif";
    context.fillStyle = colors.label;
    context.fillText(labels.get(node.id) ?? node.data.label, x + 14, y + 23);
    context.font = "600 14px sans-serif";
    context.fillStyle = colors.text;
    titleLines
      .get(node.id)!
      .forEach((line, index) =>
        context.fillText(line, x + 14, y + 46 + index * 18),
      );
    if (node.data.kind === "module") {
      const count = moduleLessonCounts.get(node.data.moduleId!) ?? 0;
      context.font = "11px sans-serif";
      context.fillStyle = colors.secondary;
      context.fillText(
        `${count} ${count === 1 ? "lesson" : "lessons"}`,
        x + 14,
        y + 50 + titleLines.get(node.id)!.length * 18,
      );
    }
  }
  return canvas;
}

export async function downloadFlowExport(
  data: FlowExportData,
  format: FlowExportFormat,
  appearance: FlowExportAppearance = "light",
) {
  const filename =
    (data.outline.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "course") + "-flow";
  if (format === "png") {
    const canvas = renderFlowExport(data, data.outline, new Set(), appearance);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(
                new Error("Could not generate PNG. Try Flow PDF instead."),
              ),
        "image/png",
      ),
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pages = flowPdfPages(data.outline);
  for (let index = 0; index < pages.length; index++) {
    if (index) doc.addPage();
    const page = pages[index];
    const canvas = renderFlowExport(
      data,
      page.outline,
      page.collapsedModules,
      appearance,
    );
    const scale = Math.min(
      (pageWidth - 48) / canvas.width,
      (pageHeight - 60) / canvas.height,
    );
    doc.addImage(
      canvas,
      "PNG",
      24,
      24,
      canvas.width * scale,
      canvas.height * scale,
      undefined,
      "FAST",
    );
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Entire course · Page ${index + 1} of ${pages.length}`,
      24,
      pageHeight - 16,
    );
    canvas.width = canvas.height = 0;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  doc.save(`${filename}.pdf`);
}

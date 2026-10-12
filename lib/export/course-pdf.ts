"use client";

// Client-side PDF export. The document is built in the browser from the course
// data already loaded on the page, so the download starts instantly and no
// server round-trip (or storage) is required.
//
// jsPDF is imported lazily so it never ships in the main bundle.

export type CourseExportResource = {
  name: string;
  type: string;
  meta?: string | null;
  content?: string | null;
  url?: string | null;
};

export type CourseExportLesson = {
  name: string;
  description?: string;
  resources?: CourseExportResource[];
};

export type CourseExportModule = {
  name: string;
  description?: string;
  lessons: CourseExportLesson[];
};

export type CourseExportData = {
  title: string;
  description: string;
  audience?: string | null;
  modules: CourseExportModule[];
};

const MARGIN = 56;
const MAX_RESOURCE_CHARS = 4000;

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "course"
  );
}

// jsPDF's built-in fonts cover Latin-1 only. Normalise common typographic
// characters so exports never lose visible text.
function clean(value: string) {
  return value
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");
}

export async function downloadCoursePdf(data: CourseExportData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const bottomLimit = pageHeight - MARGIN;
  let y = MARGIN;

  type Style = "normal" | "bold" | "italic";
  const write = (
    value: string,
    size: number,
    style: Style = "normal",
    options: { gapAfter?: number; color?: [number, number, number]; font?: string } = {},
  ) => {
    const font = options.font ?? "helvetica";
    const lineHeight = size * 1.34;
    doc.setFont(font, style);
    doc.setFontSize(size);
    const [r, g, b] = options.color ?? [32, 32, 32];
    doc.setTextColor(r, g, b);
    const lines = doc.splitTextToSize(clean(value), contentWidth) as string[];
    for (const line of lines) {
      if (y + lineHeight > bottomLimit) {
        doc.addPage();
        y = MARGIN;
      }
      y += lineHeight;
      doc.text(line, MARGIN, y);
    }
    y += options.gapAfter ?? 0;
  };

  // ── Title block ────────────────────────────────────────────────────
  write(data.title || "Untitled course", 22, "bold", { gapAfter: 8 });
  if (data.description) {
    write(data.description, 11, "normal", { color: [70, 70, 70], gapAfter: 4 });
  }
  if (data.audience) {
    write(`For: ${data.audience}`, 10, "italic", { color: [110, 110, 110], gapAfter: 4 });
  }

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.75);
  if (y + 12 > bottomLimit) {
    doc.addPage();
    y = MARGIN;
  }
  y += 8;
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 16;

  // ── Modules ────────────────────────────────────────────────────────
  if (data.modules.length === 0) {
    write("This course has no modules yet.", 11, "italic", { color: [120, 120, 120] });
  }

  data.modules.forEach((module, moduleIndex) => {
    if (moduleIndex > 0) y += 10;
    write(`${moduleIndex + 1}. ${module.name}`, 15, "bold", { gapAfter: 3 });
    if (module.description) {
      write(module.description, 10.5, "normal", { color: [80, 80, 80], gapAfter: 4 });
    }

    module.lessons.forEach((lesson, lessonIndex) => {
      write(`${moduleIndex + 1}.${lessonIndex + 1}  ${lesson.name}`, 11.5, "bold", { gapAfter: 1 });
      if (lesson.description) {
        write(lesson.description, 10, "normal", { color: [90, 90, 90], gapAfter: 2 });
      }
      (lesson.resources ?? []).forEach((resource) => {
        const label = resource.meta
          ? `${resource.type}: ${resource.name} - ${resource.meta}`
          : `${resource.type}: ${resource.name}`;
        write(label, 9.5, "normal", { color: [110, 110, 110], gapAfter: 1 });
        const body = (resource.content ?? resource.url ?? "").trim();
        if (body) {
          const clipped =
            body.length > MAX_RESOURCE_CHARS ? `${body.slice(0, MAX_RESOURCE_CHARS)}…` : body;
          write(clipped, 9, "normal", {
            font: resource.type === "Code" ? "courier" : "helvetica",
            color: [60, 60, 60],
            gapAfter: 1,
          });
        }
      });
    });
  });

  // ── Footer with page numbers ───────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(clean(data.title || "Course"), MARGIN, pageHeight - 24);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 24, {
      align: "right",
    });
  }

  doc.save(`${slugify(data.title)}.pdf`);
}

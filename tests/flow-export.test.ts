import assert from "node:assert/strict";
import { test } from "node:test";
import { flowDetailPages, flowPdfPages } from "../lib/export/flow-export";
import type { CourseOutline } from "../lib/flow/graph";

test("PDF details include every lesson in order and preserve empty modules", () => {
  const outline: CourseOutline = { id: "course", title: "Course", modules: [
    { id: "empty", title: "Empty", lessons: [] },
    { id: "long", title: "Long", lessons: Array.from({ length: 11 }, (_, i) => ({ id: `l${i}`, title: `Lesson ${i}` })) },
  ] };
  const before = JSON.stringify(outline);
  const pages = flowDetailPages(outline);
  assert.equal(pages.length, 4);
  assert.equal(pages[0].modules[0].id, "empty");
  assert.deepEqual(pages.flatMap(page => page.modules.flatMap(module => module.lessons)), outline.modules.flatMap(module => module.lessons));
  assert.ok(pages.every(page => page.modules.length === 1 && page.modules[0].lessons.length <= 4));
  assert.equal(JSON.stringify(outline), before);
});

test("empty courses do not produce spurious detail pages", () => {
  assert.deepEqual(flowDetailPages({ id: "empty", title: "", modules: [] }), []);
});

test("small Flow PDFs use one page with the entire outline", () => {
  const outline: CourseOutline = {
    id: "small",
    title: "Small course",
    modules: [
      { id: "m1", title: "Module 1", lessons: [{ id: "l1", title: "Lesson" }] },
    ],
  };
  const pages = flowPdfPages(outline);
  assert.equal(pages.length, 1);
  assert.deepEqual(pages[0].outline, outline);
  assert.equal(pages[0].collapsedModules.size, 0);
});

test("large Flow PDFs put readable module overviews before complete detail pages", () => {
  const outline: CourseOutline = {
    id: "large",
    title: "Large course",
    modules: Array.from({ length: 9 }, (_, moduleIndex) => ({
      id: `m${moduleIndex}`,
      title: `Module ${moduleIndex + 1}`,
      lessons: Array.from({ length: 5 }, (_, lessonIndex) => ({
        id: `m${moduleIndex}-l${lessonIndex}`,
        title: `Lesson ${lessonIndex + 1}`,
      })),
    })),
  };
  const pages = flowPdfPages(outline);
  const overviewPages = pages.slice(0, 3);
  const detailPages = pages.slice(3);

  assert.ok(overviewPages.every((page) => page.collapsedModules.size > 0));
  assert.deepEqual(
    overviewPages.flatMap((page) => page.outline.modules.map(({ id }) => id)),
    outline.modules.map(({ id }) => id),
  );
  assert.ok(
    overviewPages.every((page) =>
      page.outline.modules.every((module) => module.lessons.length === 0),
    ),
  );
  assert.deepEqual(
    detailPages.flatMap((page) =>
      page.outline.modules.flatMap((module) => module.lessons),
    ),
    outline.modules.flatMap((module) => module.lessons),
  );
  assert.ok(detailPages.every((page) => page.collapsedModules.size === 0));
});

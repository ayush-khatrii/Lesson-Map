import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MAX_LESSON_SECONDS,
  formatDuration,
  lessonTimingLines,
  parseVideoDuration,
  summarizeLessonTimes,
  timingSummaryLines,
} from "../lib/lesson-time";
import {
  createLessonsBulkSchema,
  lessonSchema,
  updateLessonSchema,
} from "../lib/validation";
import {
  LessonTimeFields,
  readTimeFields,
  timeFieldValues,
} from "../components/forms/LessonTimeFields";
import { LessonTime, TotalTime } from "../components/LessonTiming";
import { buildCourseGraph, type CourseOutline } from "../lib/flow/graph";
import {
  flowDetailPages,
  flowPdfPages,
  renderFlowExport,
} from "../lib/export/flow-export";

test("timing inputs distinguish omitted, cleared, and valid positive seconds", () => {
  const base = { lessonName: "Lesson" };
  assert.ok(!("estimatedCompletionSeconds" in updateLessonSchema.parse(base)));
  assert.equal(
    updateLessonSchema.parse({ ...base, estimatedCompletionSeconds: null })
      .estimatedCompletionSeconds,
    null,
  );
  for (const field of [
    "estimatedCompletionSeconds",
    "videoDurationSeconds",
  ] as const) {
    for (const value of [0, -1, 1.5, MAX_LESSON_SECONDS + 1, Infinity, "60"]) {
      assert.equal(
        updateLessonSchema.safeParse({ ...base, [field]: value }).success,
        false,
      );
    }
    assert.equal(
      updateLessonSchema.parse({ ...base, [field]: MAX_LESSON_SECONDS })[field],
      MAX_LESSON_SECONDS,
    );
  }
  const lesson = {
    ...base,
    order: 1,
    estimatedCompletionSeconds: 1800,
    videoDurationSeconds: 720,
  };
  assert.equal(
    lessonSchema.parse({ ...lesson, moduleId: "m" }).videoDurationSeconds,
    720,
  );
  assert.equal(
    createLessonsBulkSchema.parse({ moduleId: "m", lessons: [lesson] })
      .lessons[0].estimatedCompletionSeconds,
    1800,
  );
});

test("module totals keep completion and video separate, with coverage for missing values", () => {
  const lessons = [
    { estimatedCompletionSeconds: 1800, videoDurationSeconds: 720 },
    { estimatedCompletionSeconds: 900 },
    {},
  ];
  const total = summarizeLessonTimes(lessons);
  assert.deepEqual(total, {
    estimatedCompletionSeconds: 2700,
    videoDurationSeconds: 720,
    estimatedCompletionCount: 2,
    videoDurationCount: 1,
    lessonCount: 3,
  });
  assert.deepEqual(timingSummaryLines(total), [
    "45 min estimated · provided time for 2 of 3 lessons",
    "12 min video · provided time for 1 of 3 lessons",
  ]);
  assert.deepEqual(timingSummaryLines(summarizeLessonTimes([])), []);
  assert.deepEqual(timingSummaryLines(summarizeLessonTimes([{}, {}])), []);
  assert.deepEqual(lessonTimingLines(lessons[0]), [
    "30 min estimated",
    "12 min video",
  ]);
  lessons[0].estimatedCompletionSeconds = 600;
  assert.equal(summarizeLessonTimes(lessons).estimatedCompletionSeconds, 1500);
  assert.equal(
    summarizeLessonTimes(lessons.slice(1)).videoDurationSeconds,
    null,
  );
});

test("formatting rounds completion after summing and keeps video seconds", () => {
  assert.ok(
    readTimeFields(
      timeFieldValues({ estimatedCompletionSeconds: MAX_LESSON_SECONDS }),
    ),
  );
  assert.equal(formatDuration(3725), "1 hr 2 min 5 sec");
  assert.equal(formatDuration(61, true), "2 min");
  assert.equal(
    timingSummaryLines(
      summarizeLessonTimes([
        { estimatedCompletionSeconds: 1 },
        { estimatedCompletionSeconds: 1 },
      ]),
    )[0],
    "1 min estimated",
  );
  const fields = timeFieldValues({
    estimatedCompletionSeconds: 1800,
    videoDurationSeconds: 3725,
  });
  assert.deepEqual(fields, {
    completionMinutes: "30",
    videoHours: "1",
    videoMinutes: "2",
    videoSeconds: "5",
  });
  assert.deepEqual(readTimeFields(fields), {
    estimatedCompletionSeconds: 1800,
    videoDurationSeconds: 3725,
  });
  assert.deepEqual(readTimeFields(timeFieldValues()), {
    estimatedCompletionSeconds: null,
    videoDurationSeconds: null,
  });
  for (const change of [
    { completionMinutes: "0" },
    { completionMinutes: "1.5" },
    { videoMinutes: "60" },
    { videoSeconds: "60" },
    { videoSeconds: "0" },
    { videoHours: "999999999" },
  ]) {
    assert.equal(readTimeFields({ ...timeFieldValues(), ...change }), null);
  }
});

test("ISO durations support days and hours while rejecting unknown or invalid lengths", () => {
  for (const [source, expected] of [
    ["PT45S", 45],
    ["PT12M", 720],
    ["PT1H2M3S", 3723],
    ["P1DT2H", 93600],
    ["PT1500H", 5400000],
  ] as const)
    assert.equal(parseVideoDuration(source), expected);
  for (const source of [
    null,
    undefined,
    "",
    "P",
    "PT",
    "PT0S",
    "PT-1S",
    "PT1.5M",
    "P1Y",
    "P1DT",
    "12:30",
    "PT99999999999999H",
  ])
    assert.equal(parseVideoDuration(source), null);
});

test("public labels omit unset values and expose incomplete coverage", () => {
  assert.equal(
    renderToStaticMarkup(createElement(LessonTime, { lesson: {} })),
    "",
  );
  assert.match(
    renderToStaticMarkup(
      createElement(LessonTime, { lesson: {}, showUnset: true }),
    ),
    /Time not set/,
  );
  const markup = renderToStaticMarkup(
    createElement(TotalTime, {
      lessons: [{ estimatedCompletionSeconds: 600 }, {}],
    }),
  );
  assert.match(markup, /10 min estimated/);
  assert.match(markup, /provided time for 1 of 2 lessons/);
  assert.doesNotMatch(markup, /video/);
  const fields = renderToStaticMarkup(
    createElement(LessonTimeFields, {
      value: timeFieldValues({
        estimatedCompletionSeconds: 60,
        videoDurationSeconds: 125,
      }),
      onChange() {},
    }),
  );
  assert.match(fields, /Include videos, reading, and practice/);
  assert.match(fields, /combined length shown by your video hosting platform/);
  assert.match(
    fields,
    /completion estimate is shorter than the video duration/,
  );
});

test("Flow image exports print timing from the full course on every sliced page", (t) => {
  const printed: { text: string; y: number }[] = [];
  const context = {
    measureText: (text: string) => ({ width: text.length * 5 }),
    fillText: (text: string, _x: number, y: number) =>
      printed.push({ text, y }),
    scale() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    roundRect() {},
    fill() {},
  };
  const canvas = { getContext: () => context, width: 0, height: 0 };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => canvas },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  });
  const outline: CourseOutline = {
    id: "c",
    title: "Course",
    modules: [
      {
        id: "m",
        title: "Module",
        lessons: Array.from({ length: 9 }, (_, index) => ({
          id: `l${index}`,
          title: `Lesson ${index}`,
          estimatedCompletionSeconds: 600,
          videoDurationSeconds: 120,
        })),
      },
    ],
  };
  for (const page of flowPdfPages(outline)) {
    printed.length = 0;
    renderFlowExport(
      { outline, creatorName: "Creator" },
      page.outline,
      page.collapsedModules,
    );
    assert.equal(
      printed.filter(({ text }) => text === "1 hr 30 min estimated").length,
      2,
    );
    assert.equal(
      printed.filter(({ text }) => text === "18 min video").length,
      2,
    );
    assert.ok(printed.every(({ y }) => y >= 0 && y < canvas.height));
  }
});

test("Flow views and sliced exports retain full module/course totals without overlapping nodes", () => {
  const outline: CourseOutline = {
    id: "c",
    title: "Course",
    modules: [
      {
        id: "m",
        title: "Module",
        lessons: Array.from({ length: 9 }, (_, index) => ({
          id: `l${index}`,
          title: "Lesson",
          estimatedCompletionSeconds: 600,
          videoDurationSeconds: 120,
        })),
      },
    ],
  };
  const graph = buildCourseGraph(outline);
  assert.equal(graph.nodes[0].data.timingLines?.[0], "1 hr 30 min estimated");
  const collapsed = buildCourseGraph(outline, new Set(["m"]));
  assert.deepEqual(
    collapsed.nodes.find((node) => node.data.kind === "module")?.data
      .timingLines,
    graph.nodes.find((node) => node.data.kind === "module")?.data.timingLines,
  );
  const lessons = graph.nodes.filter((node) => node.data.kind === "lesson");
  lessons
    .slice(1)
    .forEach((node, index) =>
      assert.ok(
        node.position.y >=
          lessons[index].position.y + lessons[index].data.nodeHeight!,
      ),
    );
  for (const page of flowDetailPages(outline)) {
    assert.equal(page.timeSummary?.estimatedCompletionSeconds, 5400);
    assert.equal(page.modules[0].timeSummary?.videoDurationSeconds, 1080);
  }
  const overview = flowPdfPages(outline)[0].outline;
  assert.equal(overview.timeSummary?.estimatedCompletionSeconds, 5400);
  assert.equal(
    overview.modules[0].timeSummary?.estimatedCompletionSeconds,
    5400,
  );
});

const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, overrides) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      Headers,
      Response,
      URL,
      crypto,
      console,
      process: { env: {} },
      require(id) {
        if (Object.hasOwn(overrides, id)) return overrides[id];
        if (id === "server-only") return {};
        if (id.startsWith("@/")) return load(id.slice(2) + ".ts", overrides);
        return require(id);
      },
    },
    { filename: file },
  );
  return module.exports;
}

function fixture({ owns = true, signedIn = true } = {}) {
  let row = {
    id: "l",
    lessonName: "Before",
    moduleId: "m",
    estimatedCompletionSeconds: 1800,
    videoDurationSeconds: 720,
  };
  let outline, created;
  const paths = [];
  const user = { id: "owner", plan: "CREATOR", subscriptionStatus: "active" };
  const db = {
    course: {
      count: async () => 0,
      findUnique: async () => ({ id: "c", shareSlug: "shared" }),
      create: async ({ data }) => {
        outline = data;
        return { id: "c", ...data, Module: [] };
      },
    },
    module: {
      findFirst: async ({ where }) => {
        assert.equal(where.course.userId, "owner");
        return owns
          ? { id: "m", courseId: "c", course: { shareSlug: "shared" } }
          : null;
      },
    },
    lesson: {
      findFirst: async ({ where }) => {
        assert.equal(where.module.course.userId, "owner");
        return owns
          ? {
              ...row,
              module: {
                courseId: "c",
                course: { id: "c", shareSlug: "shared" },
              },
            }
          : null;
      },
      update: async ({ data }) => {
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) row[key] = value;
        });
        return { ...row };
      },
      createManyAndReturn: async ({ data }) => {
        created = data;
        return data;
      },
    },
    $transaction: async (fn) => fn(db),
  };
  const overrides = {
    "@/lib/prisma": { db },
    "@/lib/auth": {
      auth: {
        api: {
          getSession: async () =>
            signedIn ? { session: { userId: "owner" } } : null,
        },
      },
    },
    "@/lib/course-access": { lockCourseOwner: async () => user },
    "@/lib/course-cache": { userCoursesTag: (id) => `courses:${id}` },
    "next/headers": { headers: async () => new Headers() },
    "next/cache": {
      updateTag() {},
      revalidateTag() {},
      revalidatePath: (path) => paths.push(path),
    },
    "next/server": { NextResponse: { json: Response.json.bind(Response) } },
  };
  return {
    actions: load("lib/actions.ts", overrides),
    route: load("app/api/lesson/[lessonId]/route.ts", overrides),
    paths,
    row: () => row,
    outline: () => outline,
    created: () => created,
  };
}

const context = { params: Promise.resolve({ lessonId: "l" }) };

test("lesson action saves, preserves omitted values, clears explicitly, and refreshes public/creator views", async () => {
  const f = fixture();
  let result = await f.actions.updateLessonAction("l", {
    lessonName: "Edited",
    estimatedCompletionSeconds: 2400,
  });
  assert.equal(result.success, true);
  assert.equal(f.row().estimatedCompletionSeconds, 2400);
  assert.equal(f.row().videoDurationSeconds, 720);
  result = await f.actions.updateLessonAction("l", {
    lessonName: "Edited",
    videoDurationSeconds: null,
  });
  assert.equal(result.success, true);
  assert.equal(f.row().videoDurationSeconds, null);
  assert.equal(f.row().estimatedCompletionSeconds, 2400);
  assert.ok(f.paths.includes("/p/shared"));
  assert.ok(f.paths.includes("/dashboard/c/edit"));
  assert.equal(
    (
      await f.actions.updateLessonAction("l", {
        lessonName: "Edited",
        estimatedCompletionSeconds: -1,
      })
    ).success,
    false,
  );
  assert.equal(f.row().estimatedCompletionSeconds, 2400);
});

test("bulk lesson creation and draft outline saves carry both timing values", async () => {
  const f = fixture();
  const timing = {
    estimatedCompletionSeconds: 1800,
    videoDurationSeconds: 720,
  };
  const result = await f.actions.createLessonsAction({
    moduleId: "m",
    lessons: [{ lessonName: "Lesson", order: 1, ...timing }],
  });
  assert.equal(result.success, true);
  assert.equal(f.created()[0].estimatedCompletionSeconds, 1800);
  assert.equal(f.created()[0].videoDurationSeconds, 720);
  assert.ok(f.paths.includes("/p/shared"));
  const draft = await f.actions.createCourseWithOutlineAction({
    courseName: "Course",
    description: "Description",
    modules: [
      {
        moduleName: "Module",
        description: "Description",
        lessons: [{ lessonName: "Lesson", ...timing }],
      },
    ],
  });
  assert.equal(draft.success, true);
  const savedLesson = f.outline().Module.create[0].Lesson.create[0];
  assert.equal(savedLesson.estimatedCompletionSeconds, 1800);
  assert.equal(savedLesson.videoDurationSeconds, 720);
});

test("HTTP lesson updates preserve old clients and allow clearing video duration", async () => {
  const f = fixture();
  const base = { lessonName: "HTTP lesson", moduleId: "m", order: 1 };
  let response = await f.route.PUT({ json: async () => base }, context);
  assert.equal(response.status, 200);
  assert.equal(f.row().videoDurationSeconds, 720);
  response = await f.route.PUT(
    {
      json: async () => ({
        ...base,
        videoDurationSeconds: null,
        estimatedCompletionSeconds: 600,
      }),
    },
    context,
  );
  assert.equal(response.status, 200);
  assert.equal(f.row().videoDurationSeconds, null);
  assert.equal(f.row().estimatedCompletionSeconds, 600);
  assert.ok(f.paths.includes("/p/shared"));
});

test("timing writes reject signed-out users and lessons owned by someone else", async () => {
  for (const options of [{ owns: false }, { signedIn: false }]) {
    const f = fixture(options);
    assert.equal(
      (
        await f.actions.updateLessonAction("l", {
          lessonName: "Edited",
          estimatedCompletionSeconds: 1,
        })
      ).success,
      false,
    );
    const response = await f.route.PUT(
      {
        json: async () => ({
          lessonName: "Edited",
          order: 1,
          moduleId: "m",
          videoDurationSeconds: 1,
        }),
      },
      context,
    );
    assert.equal(response.status, options.signedIn === false ? 401 : 404);
    assert.equal(f.row().videoDurationSeconds, 720);
    assert.equal(f.row().estimatedCompletionSeconds, 1800);
  }
});

test("Markdown export prints separate lesson/module/course times and partial coverage", async () => {
  const route = load("app/api/course/[courseId]/export/markdown/route.ts", {
    "@/lib/auth": {
      auth: {
        api: { getSession: async () => ({ session: { userId: "owner" } }) },
      },
    },
    "next/headers": { headers: async () => new Headers() },
    "next/server": { NextResponse: { json: Response.json.bind(Response) } },
    "@/lib/prisma": {
      db: {
        user: {
          findUnique: async () => ({
            plan: "CREATOR",
            subscriptionStatus: "active",
          }),
        },
        course: {
          findFirst: async ({ where }) => {
            assert.equal(where.userId, "owner");
            return {
              courseName: "Course",
              description: "Description",
              Module: [
                {
                  moduleName: "Module",
                  description: "Description",
                  Lesson: [
                    {
                      lessonName: "Lesson",
                      estimatedCompletionSeconds: 1800,
                      videoDurationSeconds: 720,
                    },
                    { lessonName: "Untimed" },
                  ],
                },
              ],
            };
          },
        },
      },
    },
  });
  const response = await route.GET(
    {},
    { params: Promise.resolve({ courseId: "c" }) },
  );
  const markdown = await response.text();
  assert.equal(response.status, 200);
  assert.equal(
    markdown.match(/30 min estimated · provided time for 1 of 2 lessons/g)
      .length,
    2,
  );
  assert.equal(
    markdown.match(/12 min video · provided time for 1 of 2 lessons/g).length,
    2,
  );
  assert.match(markdown, /30 min estimated · 12 min video/);
  assert.doesNotMatch(markdown, /42 min/);
});

test("PDF export includes timing at all levels and hides unset lesson values", async () => {
  const lines = [];
  class Pdf {
    internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 } };
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {}
    addPage() {}
    setPage() {}
    save() {}
    getNumberOfPages() {
      return 1;
    }
    splitTextToSize(text) {
      return [text];
    }
    text(text) {
      lines.push(text);
    }
  }
  const { downloadCoursePdf } = load("lib/export/course-pdf.ts", {
    jspdf: { jsPDF: Pdf },
  });
  await downloadCoursePdf({
    title: "Course",
    description: "Description",
    modules: [
      {
        name: "Module",
        lessons: [
          {
            name: "Lesson",
            estimatedCompletionSeconds: 1800,
            videoDurationSeconds: 720,
          },
          { name: "Untimed" },
        ],
      },
    ],
  });
  assert.equal(
    lines.filter(
      (line) => line === "30 min estimated · provided time for 1 of 2 lessons",
    ).length,
    2,
  );
  assert.ok(lines.includes("30 min estimated - 12 min video"));
  assert.ok(!lines.some((line) => /(?:^|[^0-9])0 min|42 min/.test(line)));
});

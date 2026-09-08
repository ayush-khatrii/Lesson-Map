const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise real route/action control flow without a live database or session.
// Next.js cache storage itself is exercised by the production build, not mocked
// as an in-memory cache here: these tests cover isolation and invalidation.
function harness({ authenticated = true, failWrite = false } = {}) {
  const events = [];
  const course = {
    id: "course-1", userId: "user-a", courseName: "Course",
    isPublic: false, shareSlug: "course-slug", Module: [],
    _count: { Module: 1 },
  };
  const db = {};
  for (const model of ["course", "module", "lesson", "resource", "user"]) {
    db[model] = {};
    for (const operation of ["findFirst", "findUnique", "findMany", "count", "create", "update", "delete", "deleteMany"]) {
      db[model][operation] = async (args) => {
        const write = ["create", "update", "delete", "deleteMany"].includes(operation);
        events.push({ type: write ? "write" : "read", model, operation, args });
        if (write && failWrite) throw new Error("Database write failed");
        if (operation === "count") return 0;
        if (operation === "deleteMany") return { count: 1 };
        if (operation === "findMany") return [{ ...course, userId: args.where.userId }];
        if (model === "user") return { plan: "CREATOR" };
        if (model === "course" && args?.where?.userId && args.where.userId !== course.userId) return null;
        return { ...course, ...args?.data };
      };
    }
  }
  db.$transaction = (operations) => Promise.all(operations);
  const cache = {
    cacheLife: (profile) => events.push({ type: "life", profile }),
    cacheTag: (tag) => events.push({ type: "tag", tag }),
    revalidateTag: (tag, options) => events.push({ type: "expire", tag, options }),
    updateTag: (tag) => events.push({ type: "update", tag }),
    revalidatePath: () => {},
  };
  const modules = {
    "server-only": {},
    "next/cache": cache,
    "next/headers": { headers: async () => new Headers() },
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/prisma": { db },
    "@/lib/auth": { auth: { api: { getSession: async () => authenticated ? { session: { userId: "user-a" } } : null } } },
    "@/lib/slug": { generateUniqueShareSlug: async () => "course-slug" },
    "@/lib/validation": new Proxy({}, { get: () => ({ safeParse: (data) => ({ success: true, data }) }) }),
  };
  function load(relativePath) {
    const filename = path.join(__dirname, "..", relativePath);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    const execute = vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename });
    execute((id) => {
      if (id === "@/lib/course-cache") return load("lib/course-cache.ts");
      return Object.hasOwn(modules, id) ? modules[id] : require(id);
    }, module, module.exports);
    return module.exports;
  }
  return { events, load };
}

test("course reads filter and tag by user; another user cannot read a course by ID", async () => {
  const { load, events } = harness();
  const { getUserCourses, getUserCourse } = load("lib/course-cache.ts");
  assert.equal((await getUserCourses("user-a"))[0].userId, "user-a");
  assert.equal((await getUserCourses("user-b"))[0].userId, "user-b");
  assert.equal(await getUserCourse("user-b", "course-1"), null);
  assert.equal((await getUserCourse("user-a", "course-1")).id, "course-1");
  assert.deepEqual(events.filter(e => e.type === "tag").map(e => e.tag), [
    "user-courses:user-a", "user-courses:user-b", "user-courses:user-b", "user-courses:user-a",
  ]);
});

for (const route of ["app/api/course/route.ts", "app/api/course/[courseId]/route.ts"]) {
  test(`${route}: authentication runs before cached reads`, async () => {
    const { load, events } = harness({ authenticated: false });
    const response = await load(route).GET(new Request("http://localhost/api/course"), {
      params: Promise.resolve({ courseId: "course-1" }),
    });
    assert.equal(response.status, 401);
    assert.equal(events.length, 0);
  });
}

const data = {
  courseId: "course-1", moduleId: "module-1", lessonId: "lesson-1",
  courseName: "Updated", description: "Description", moduleName: "Module", lessonName: "Lesson",
  modules: [{ moduleName: "Module", description: "Description", order: 0 }],
  lessons: [{ lessonName: "Lesson", order: 0 }],
  name: "Resource", type: "Link", url: "https://example.com",
};
const routes = [
  ["app/api/course/[courseId]/route.ts", "PUT"],
  ["app/api/course/[courseId]/route.ts", "DELETE"],
  ["app/api/course/[courseId]/publish/route.ts", "POST"],
  ["app/api/module/[moduleId]/route.ts", "PUT"],
  ["app/api/module/[moduleId]/route.ts", "DELETE"],
  ["app/api/lesson/[lessonId]/route.ts", "PUT"],
  ["app/api/lesson/[lessonId]/route.ts", "DELETE"],
  ["app/api/resource/route.ts", "POST"],
  ["app/api/resource/[resourceId]/route.ts", "PUT"],
  ["app/api/resource/[resourceId]/route.ts", "DELETE"],
  ["app/complete-upload/route.ts", "POST"],
];
for (const [route, method] of routes) {
  for (const failWrite of [false, true]) {
    test(`${method} ${route}: ${failWrite ? "failed writes keep" : "successful writes expire"} cached results`, async () => {
      const { load, events } = harness({ failWrite });
      const response = await load(route)[method](new Request("http://localhost/test", {
        method, body: JSON.stringify(data), headers: { "Content-Type": "application/json" },
      }), { params: Promise.resolve({ courseId: "course-1", moduleId: "module-1", lessonId: "lesson-1", resourceId: "resource-1" }) });
      assert.equal(response.status >= 200 && response.status < 300, !failWrite);
      const expirations = events.filter(e => e.type === "expire");
      assert.deepEqual(expirations, failWrite ? [] : [{ type: "expire", tag: "user-courses:user-a", options: { expire: 0 } }]);
      if (!failWrite) assert.ok(events.findIndex(e => e.type === "write") < events.findIndex(e => e.type === "expire"));
    });
  }
}

for (const action of ["createCourseAction", "createModulesAction", "createLessonsAction", "reorderModulesAction", "reorderLessonsAction", "updateCourseAction", "deleteCourseAction"]) {
  test(`${action}: expires the current user cache after a successful write`, async () => {
    const { load, events } = harness();
    const args = action === "reorderModulesAction" ? ["course-1", ["module-1"]]
      : action === "reorderLessonsAction" ? ["module-1", ["lesson-1"]]
      : action === "updateCourseAction" ? ["course-1", data]
      : action === "deleteCourseAction" ? ["course-1"] : [data];
    assert.equal((await load("lib/actions.ts")[action](...args)).success, true);
    assert.deepEqual(events.filter(e => e.type === "update"), [{ type: "update", tag: "user-courses:user-a" }]);
    assert.ok(events.findIndex(e => e.type === "write") < events.findIndex(e => e.type === "update"));
  });
}

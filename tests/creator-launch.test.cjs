const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { z } = require("zod");
const { PGlite } = require("@electric-sql/pglite");

function load(file, overrides = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      URL,
      URLSearchParams,
      Response,
      Headers,
      Date,
      AbortSignal,
      process: { env: { YOUTUBE_API_KEY: "test-key" } },
      console: { error() {} },
      crypto,
      require(id) {
        if (id in overrides) return overrides[id];
        if (id === "node:crypto") return require(id);
        if (id === "zod") return { z };
        if (id === "next/server")
          return { NextResponse: { json: Response.json.bind(Response) } };
        if (id === "next/cache") return { revalidateTag() {} };
        if (id === "@/lib/course-cache")
          return { userCoursesTag: (id) => `user-courses:${id}` };
        if (id === "@/lib/ai/schema") return require("./helpers/ai-schema.cjs");
        if (id === "@/lib/lesson-time") return load("lib/lesson-time.ts");
        if (id === "@/lib/plans") return load("lib/plans.ts");
        if (id === "@/lib/csv") return load("lib/csv.ts");
        if (id === "@/lib/payments/request-security")
          return { isSameOriginRequest: () => true };
        throw new Error(`Unexpected import: ${id}`);
      },
      ...globals,
    },
    { filename: file },
  );
  return module.exports;
}
const paid = {
  plan: "CREATOR",
  subscriptionStatus: "active",
  subscriptionCancelAtPeriodEnd: false,
  subscriptionCurrentPeriodEnd: null,
};
const free = { ...paid, plan: "FREE", subscriptionStatus: null };
const context = (key, value) => ({ params: Promise.resolve({ [key]: value }) });
const request = (body) => ({
  json: async () => body,
  url: "https://lessonmap.org/test",
});
function access(userId = "user-1") {
  return {
    sessionUserId: async () => userId,
    allowRequest: async () => true,
    launchError: () => Response.json({ error: "Failed" }, { status: 500 }),
  };
}

function importFixture({
  plan = free,
  used = 0,
  count = 0,
  failFetch = false,
  signedOut = false,
  failCache = false,
} = {}) {
  let user = { ...plan, youtubeImports: used };
  let created = 0;
  let fetched = 0;
  const imports = new Map();
  const youtube = load("lib/youtube.ts");
  const db = {
    user: {
      findUnique: async () => user,
      findUniqueOrThrow: async () => user,
      update: async () => {
        user.youtubeImports++;
      },
    },
    playlistImport: {
      findUnique: async ({ where }) =>
        imports.get(where.userId_requestId.requestId),
      create: async ({ data }) => imports.set(data.requestId, data),
    },
    course: {
      count: async () => count + created,
      create: async () => ({ id: `course-${++created}` }),
    },
    module: { create: async () => ({ id: "module-1" }) },
    lesson: { createMany: async () => ({ count: 1 }), count: async () => 1 },
    resource: { createMany: async () => ({ count: 1 }) },
  };
  let queue = Promise.resolve();
  db.$transaction = (fn) => {
    const task = queue.then(() => fn(db));
    queue = task.catch(() => {});
    return task;
  };
  const route = load("app/api/import/youtube/route.ts", {
    "@/lib/prisma": { db },
    "@/lib/launch-access": access(signedOut ? null : "user-1"),
    "@/lib/course-access": { lockCourseOwner: async () => user },
    "@/lib/youtube-course": load("lib/youtube-course.ts"),
    "next/cache": {
      revalidateTag() {
        if (failCache) throw new Error("Cache unavailable");
      },
    },
    "@/lib/youtube": {
      YouTubeImportError: youtube.YouTubeImportError,
      playlistIdFromUrl: () => "playlist-1",
      fetchPlaylist: async () => {
        fetched++;
        if (failFetch)
          throw new youtube.YouTubeImportError(
            "YouTube unavailable",
            "YOUTUBE_ACCESS_DENIED",
            503,
          );
        return {
          title: "Playlist",
          description: "Description",
          videos: [{ title: "One", description: "", videoId: "video" }],
          skipped: 0,
        };
      },
    },
  });
  return {
    route,
    user,
    stats: () => ({ created, fetched }),
    body: (id = "00000000-0000-4000-8000-000000000001") =>
      request({
        url: "https://www.youtube.com/playlist?list=playlist-1",
        requestId: id,
      }),
  };
}

test("Free playlist import is charged once and repeated requests replay the course", async () => {
  const f = importFixture();
  const first = await f.route.POST(f.body());
  assert.equal(first.status, 200);
  const replay = await f.route.POST(f.body());
  assert.equal((await replay.json()).courseId, (await first.json()).courseId);
  assert.equal(f.user.youtubeImports, 1);
  assert.deepEqual(f.stats(), { created: 1, fetched: 1 });
});
test("two concurrent Free imports cannot consume more than one allowance", async () => {
  const f = importFixture();
  const responses = await Promise.all([
    f.route.POST(f.body()),
    f.route.POST(f.body("00000000-0000-4000-8000-000000000002")),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 403]);
  assert.equal(f.user.youtubeImports, 1);
  assert.equal(f.stats().created, 1);
});
test("failed imports do not consume the allowance or create partial courses", async () => {
  const f = importFixture({ failFetch: true });
  const response = await f.route.POST(f.body());
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.code, "YOUTUBE_ACCESS_DENIED");
  assert.equal(body.requestId, "00000000-0000-4000-8000-000000000001");
  assert.equal(f.user.youtubeImports, 0);
  assert.equal(f.stats().created, 0);
});
test("cache invalidation failure preserves success and safe request replay", async () => {
  const f = importFixture({ failCache: true });
  const first = await f.route.POST(f.body());
  assert.equal(first.status, 200);
  const replay = await f.route.POST(f.body());
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).courseId, (await first.json()).courseId);
  assert.equal(f.user.youtubeImports, 1);
  assert.equal(f.stats().created, 1);
});
test("Free course and import limits and authentication are enforced by the route", async () => {
  for (const options of [{ count: 3 }, { used: 1 }, { signedOut: true }]) {
    const f = importFixture(options);
    assert.equal(
      (await f.route.POST(f.body())).status,
      options.signedOut ? 401 : 403,
    );
    assert.equal(f.stats().created, 0);
  }
});
test("Creator can import beyond the Free allowance", async () => {
  const f = importFixture({ plan: paid, used: 10, count: 10 });
  assert.equal((await f.route.POST(f.body())).status, 200);
});

test("YouTube helper follows pagination, skips unavailable videos and preserves order", async () => {
  const calls = [];
  const helper = load(
    "lib/youtube.ts",
    {},
    {
      fetch: async (url) => {
        const parsed = new URL(url);
        calls.push(parsed);
        if (parsed.pathname.endsWith("/playlists"))
          return Response.json({
            items: [{ snippet: { title: "Course", description: "Test" } }],
          });
        if (parsed.pathname.endsWith("/videos"))
          return Response.json({ items: [{ id: "two", contentDetails: { duration: "PT2M5S" } }, { id: "one", contentDetails: { duration: "PT1M" } }] });
        if (!parsed.searchParams.get("pageToken"))
          return Response.json({
            items: [
              {
                snippet: { title: "First" },
                contentDetails: { videoId: "one" },
              },
              {
                snippet: { title: "Private video" },
                contentDetails: { videoId: "private" },
              },
            ],
            nextPageToken: "second-page",
          });
        return Response.json({
          items: [
            {
              snippet: { title: "Second" },
              contentDetails: { videoId: "two" },
            },
          ],
        });
      },
    },
  );
  assert.throws(() =>
    helper.playlistIdFromUrl("https://evil.example/playlist?list=1234567890"),
  );
  const result = await helper.fetchPlaylist(
    helper.playlistIdFromUrl(
      "https://www.youtube.com/playlist?list=1234567890",
    ),
  );
  assert.equal(result.skipped, 1);
  assert.equal(result.videos.map((v) => v.videoId).join(","), "one,two");
  assert.equal(calls.length, 4);
  assert.equal(result.videos[0].videoDurationSeconds, 60);
  assert.equal(result.videos[1].videoDurationSeconds, 125);
  assert.ok(calls.every((url) => url.searchParams.get("key") === "test-key"));
});

test("cloning uses a new owner, defaults to private and excludes uploads and private metadata", async () => {
  let saved;
  const db = {
    course: {
      count: async () => 0,
      findFirst: async ({ where }) => {
        assert.equal(where.isPublic, true);
        return {
          courseName: "Course",
          description: "Description",
          audience: null,
          emailCapture: true,
          Module: [
            {
              moduleName: "Module",
              description: "",
              order: 1,
              Lesson: [
                {
                  lessonName: "Lesson",
                  description: "Notes",
                  order: 1,
                  resources: [
                    {
                      type: "PDF",
                      url: "https://private.example/file",
                      key: "upload",
                    },
                    {
                      type: "Link",
                      url: "https://youtube.com/watch?v=one",
                      name: "Video",
                    },
                    {
                      type: "Link",
                      url: "/api/resource/private/open",
                      name: "Private",
                    },
                  ],
                },
              ],
            },
          ],
        };
      },
      create: async ({ data }) => {
        saved = data;
        return { id: "new" };
      },
    },
    $transaction: async (fn) => fn(db),
  };
  const route = load("app/api/public/[slug]/clone/route.ts", {
    "@/lib/prisma": { db },
    "@/lib/launch-access": access(),
    "@/lib/course-access": { lockCourseOwner: async () => free },
  });
  assert.equal(
    (await route.POST(request({}), context("slug", "public"))).status,
    200,
  );
  assert.equal(saved.userId, "user-1");
  assert.equal(saved.isPublic, undefined);
  assert.equal(saved.emailCapture, undefined);
  const resources = saved.Module.create[0].Lesson.create[0].resources.create;
  assert.equal(resources.length, 1);
  assert.equal(resources[0].url, "https://youtube.com/watch?v=one");
});

test("database progress starts empty and reads are scoped to the signed-in user", async () => {
  let filter;
  const db = {
    course: { findFirst: async () => ({ id: "course-1" }) },
    lessonProgress: {
      findMany: async ({ where }) => {
        filter = where;
        return [];
      },
    },
  };
  const route = load("app/api/progress/[courseId]/route.ts", {
    "@/lib/prisma": { db },
    "@/lib/launch-access": access(),
  });
  const response = await route.GET(
    request({}),
    context("courseId", "public-slug"),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { progress: [] });
  assert.equal(filter.userId, "user-1");
  assert.equal(filter.lesson.module.courseId, "course-1");
});
test("lesson progress validates course access and lesson membership before writing", async () => {
  for (const missing of ["user", "course", "lesson", null]) {
    let saved;
    const db = {
      course: {
        findFirst: async ({ where }) => {
          assert.equal(where.AND[0].OR[0].userId, "user-1");
          return missing === "course" ? null : { id: "course-1" };
        },
      },
      lesson: {
        findFirst: async ({ where }) => {
          assert.equal(where.module.courseId, "course-1");
          return missing === "lesson" ? null : { id: "lesson-1" };
        },
      },
      lessonProgress: {
        upsert: async (args) => {
          saved = args;
          return args.create;
        },
      },
    };
    const route = load("app/api/progress/[courseId]/route.ts", {
      "@/lib/prisma": { db },
      "@/lib/launch-access": access(missing === "user" ? null : "user-1"),
    });
    const response = await route.POST(
      request({ lessonId: "lesson-1", completed: true }),
      context("courseId", "course-1"),
    );
    assert.equal(
      response.status,
      missing === "user" ? 401 : missing ? 404 : 200,
    );
    if (missing) assert.equal(saved, undefined);
    else {
      assert.equal(saved.where.userId_lessonId.userId, "user-1");
      assert.ok(saved.create.completedAt);
    }
  }
});
test("opening a completed lesson preserves completion; unchecking stores null", async () => {
  const writes = [];
  const db = {
    course: { findFirst: async () => ({ id: "c" }) },
    lesson: { findFirst: async () => ({ id: "l" }) },
    lessonProgress: {
      upsert: async (args) => {
        writes.push(args);
        return {};
      },
    },
  };
  const route = load("app/api/progress/[courseId]/route.ts", {
    "@/lib/prisma": { db },
    "@/lib/launch-access": access(),
  });
  await route.POST(request({ lessonId: "l" }), context("courseId", "c"));
  assert.equal(Object.hasOwn(writes[0].update, "completedAt"), false);
  await route.POST(
    request({ lessonId: "l", completed: false }),
    context("courseId", "c"),
  );
  assert.equal(writes[1].update.completedAt, null);
});

test("lead export requires ownership and escapes CSV formulas and quotes", async () => {
  const db = {
    course: {
      findFirst: async ({ where }) => {
        assert.equal(where.userId, "user-1");
        return { id: "c" };
      },
    },
    lead: {
      findMany: async () => [
        {
          email: '=HYPERLINK("bad")@example.com',
          createdAt: new Date("2026-11-16"),
        },
      ],
    },
  };
  const route = load("app/api/course/[courseId]/leads/route.ts", {
    "@/lib/prisma": { db },
    "@/lib/launch-access": access(),
  });
  const response = await route.GET(
    { url: "https://lessonmap.org/api/course/c/leads?format=csv" },
    context("courseId", "c"),
  );
  assert.match(await response.text(), /"'=HYPERLINK\(""bad""\)@example.com"/);
  db.course.findFirst = async () => null;
  assert.equal(
    (await route.GET(request({}), context("courseId", "c"))).status,
    404,
  );
});
test("email capture requires an active paid owner, consent and an empty honeypot", async () => {
  let writes = 0;
  let plan = free;
  const db = {
    course: { findFirst: async () => ({ id: "c", user: plan }) },
    lead: {
      upsert: async () => {
        writes++;
      },
    },
  };
  const route = load("app/api/public/[slug]/leads/route.ts", {
    "@/lib/prisma": { db },
    "@/lib/launch-access": access(),
  });
  const valid = { email: "Person@Example.com", consent: true, website: "" };
  assert.equal(
    (await route.POST(request(valid), context("slug", "s"))).status,
    404,
  );
  plan = paid;
  assert.equal(
    (
      await route.POST(
        request({ ...valid, consent: false }),
        context("slug", "s"),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await route.POST(
        request({ ...valid, website: "spam" }),
        context("slug", "s"),
      )
    ).status,
    400,
  );
  assert.equal(
    (await route.POST(request(valid), context("slug", "s"))).status,
    200,
  );
  assert.equal(writes, 1);
});

test("lead limits isolate visitors and courses, with a shared 100-request backup", async () => {
  const counts = new Map();
  let writes = 0;
  const route = load("app/api/public/[slug]/leads/route.ts", {
    "@/lib/prisma": { db: {
      course: { findFirst: async ({ where }) => ({ id: where.shareSlug, user: paid }) },
      lead: { upsert: async () => { writes++; } },
    } },
    "@/lib/launch-access": {
      ...access(),
      allowRequest: async (key, limit) => {
        const count = (counts.get(key) || 0) + 1;
        counts.set(key, count);
        return count <= limit;
      },
    },
  }, { process: { env: { VERCEL: "1" } } });
  const submit = (ip, slug = "course-a", forwarded = "spoofed") => route.POST({
    ...request({ email: "person@example.com", consent: true, website: "" }),
    headers: new Headers({
      ...(ip ? { "x-vercel-forwarded-for": ip } : {}),
      "x-forwarded-for": forwarded,
    }),
  }, context("slug", slug));

  for (let i = 0; i < 5; i++) assert.equal((await submit("192.0.2.1")).status, 200);
  const blocked = await submit("192.0.2.1", "course-a", "different-spoof");
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error, "Please try again in a minute.");
  assert.equal(counts.get("lead:course-a"), 5);
  assert.equal(writes, 5);
  assert.equal((await submit("192.0.2.2")).status, 200);
  assert.equal((await submit("192.0.2.1", "course-b")).status, 200);

  for (let i = 0; i < 94; i++) {
    assert.equal((await submit(`198.51.100.${i + 1}`)).status, 200);
  }
  assert.equal(counts.get("lead:course-a"), 100);
  assert.equal((await submit("203.0.113.1")).status, 429);
  assert.equal(writes, 101); // 100 for course-a, plus one for course-b.

  for (let i = 0; i < 5; i++) assert.equal((await submit(null, "course-c")).status, 200);
  assert.equal((await submit(null, "course-c", "new-spoof")).status, 429);
});

test("migration applies and database uniqueness enforces events, leads and per-user progress", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      'CREATE TABLE "user" (id TEXT PRIMARY KEY); CREATE TABLE "Course" (id TEXT PRIMARY KEY); CREATE TABLE "Lesson" (id TEXT PRIMARY KEY);',
    );
    await pg.exec(
      fs.readFileSync(
        "prisma/migrations/20261116000000_creator_launch/migration.sql",
        "utf8",
      ),
    );
    await pg.exec(
      `INSERT INTO "user" (id) VALUES ('u1'), ('u2'); INSERT INTO "Course" (id) VALUES ('c'); INSERT INTO "Lesson" (id) VALUES ('l');`,
    );
    await pg.exec(
      `INSERT INTO "CourseEvent" (id, "courseId", "sessionId", kind) VALUES ('e1', 'c', 'session', 'visit');`,
    );
    await assert.rejects(
      () =>
        pg.exec(
          `INSERT INTO "CourseEvent" (id, "courseId", "sessionId", kind) VALUES ('e2', 'c', 'session', 'visit');`,
        ),
      /duplicate key/,
    );
    await pg.exec(
      `INSERT INTO "Lead" (id, "courseId", email) VALUES ('a', 'c', 'a@example.com');`,
    );
    await assert.rejects(
      () =>
        pg.exec(
          `INSERT INTO "Lead" (id, "courseId", email) VALUES ('b', 'c', 'a@example.com');`,
        ),
      /duplicate key/,
    );
    await pg.exec(
      `INSERT INTO "LessonProgress" (id, "userId", "lessonId", "updatedAt") VALUES ('p1', 'u1', 'l', now()), ('p2', 'u2', 'l', now());`,
    );
    assert.equal(
      (await pg.query('SELECT * FROM "LessonProgress"')).rows.length,
      2,
    );
    await pg.exec(`DELETE FROM "Lesson" WHERE id = 'l';`);
    assert.equal(
      (await pg.query('SELECT * FROM "LessonProgress"')).rows.length,
      0,
    );
  } finally {
    await pg.close();
  }
});

test("new cookie-authenticated writes reject a foreign origin before reading the user", async () => {
  for (const [file, method] of [
    ["app/api/import/youtube/route.ts", "POST"],
    ["app/api/public/[slug]/clone/route.ts", "POST"],
    ["app/api/progress/[courseId]/route.ts", "POST"],
    ["app/api/course/[courseId]/leads/route.ts", "PATCH"],
    ["app/api/settings/subdomain/route.ts", "POST"],
  ]) {
    let reads = 0;
    const route = load(file, {
      "@/lib/prisma": { db: {} },
      "@/lib/launch-access": {
        ...access(),
        sessionUserId: async () => {
          reads++;
          return "user-1";
        },
      },
      "@/lib/payments/request-security": { isSameOriginRequest: () => false },
      "@/lib/course-access": {},
      "@/lib/youtube": {},
      "@/lib/youtube-course": {},
      "@/lib/subdomain": {},
    });
    assert.equal(
      (await route[method](request({}), context("courseId", "c"))).status,
      403,
      file,
    );
    assert.equal(reads, 0);
  }
});

test("visit/start totals deduplicate a browser session and ignore owners", async () => {
  const events = new Map();
  let visitor = "visitor";
  const db = {
    course: { findFirst: async () => ({ id: "c", userId: "owner" }) },
    courseEvent: {
      upsert: async ({ create }) =>
        events.set(`${create.sessionId}:${create.kind}`, create),
    },
  };
  const route = load("app/api/public/[slug]/events/route.ts", {
    "@/lib/prisma": { db },
    "@/lib/launch-access": { ...access(), sessionUserId: async () => visitor },
  });
  const sessionId = "00000000-0000-4000-8000-000000000001";
  for (const kind of ["visit", "visit", "start", "start"]) {
    assert.equal(
      (await route.POST(request({ sessionId, kind }), context("slug", "s")))
        .status,
      200,
    );
  }
  assert.equal(events.size, 2);
  visitor = "owner";
  await route.POST(
    request({
      sessionId: "00000000-0000-4000-8000-000000000002",
      kind: "visit",
    }),
    context("slug", "s"),
  );
  assert.equal(events.size, 2);
});

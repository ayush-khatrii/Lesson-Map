const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");
const { PGLiteSocketServer } = require("@electric-sql/pglite-socket");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { PrismaClient } = require("../app/generated/prisma/client.ts");

// Run the actual route and persistence helper with the production Prisma adapter.
// Only auth, Google, and Next's cache/response wrappers are replaced.
function load(file, overrides = {}, log = console) {
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
      crypto,
      URL,
      URLSearchParams,
      Request,
      Response,
      Headers,
      AbortSignal,
      Date,
      process: { env: {} },
      console: log,
      require(id) {
        if (Object.hasOwn(overrides, id)) return overrides[id];
        if (id === "server-only") return {};
        if (id.startsWith("@/"))
          return load(id.slice(2) + ".ts", overrides, log);
        return require(id);
      },
    },
    { filename: file },
  );
  return module.exports;
}

function playlist(size) {
  return {
    title: "Imported course",
    description: "Playlist introduction",
    skipped: 2,
    videos: Array.from({ length: size }, (_, i) => ({
      title: `Lesson ${i + 1}`,
      description: `Notes ${i + 1}`,
      videoId: `video-${i + 1}`,
    })),
  };
}

function fixture(db, videos, { failCache = false, fetchBarrier } = {}) {
  const logs = [];
  const log = { error: (...args) => logs.push(args) };
  let fetches = 0;
  const overrides = {
    "@/lib/prisma": { db },
    "@/lib/auth": {
      auth: {
        api: { getSession: async () => ({ session: { userId: "owner" } }) },
      },
    },
    "next/headers": { headers: async () => new Headers() },
    "next/server": { NextResponse: { json: Response.json.bind(Response) } },
    "next/cache": {
      revalidateTag() {
        if (failCache) throw new Error("Cache unavailable");
      },
    },
    "@/lib/youtube": {
      ...load("lib/youtube.ts"),
      fetchPlaylist: async () => {
        fetches++;
        await fetchBarrier?.();
        return videos;
      },
    },
  };
  const access = load("lib/launch-access.ts", overrides, log);
  overrides["@/lib/launch-access"] = {
    ...access,
    allowRequest: async () => true,
  };
  const route = load("app/api/import/youtube/route.ts", overrides, log);
  return {
    logs,
    fetches: () => fetches,
    post: (
      requestId = "00000000-0000-4000-8000-000000000001",
      list = "PLabcdefghijk",
    ) =>
      route.POST(
        new Request("https://lessonmap.org/api/import/youtube", {
          method: "POST",
          headers: {
            Origin: "https://lessonmap.org",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: `https://www.youtube.com/playlist?list=${list}`,
            requestId,
          }),
        }),
      ),
  };
}

async function seed(db, paid = false) {
  await db.$executeRawUnsafe('TRUNCATE TABLE "user" CASCADE');
  await db.user.create({
    data: {
      id: "owner",
      name: "Test creator",
      email: "creator@example.test",
      ...(paid ? { plan: "CREATOR", subscriptionStatus: "active" } : {}),
    },
  });
}

async function assertEmptyImport(db) {
  for (const model of [
    "course",
    "module",
    "lesson",
    "resource",
    "playlistImport",
  ]) {
    assert.equal(await db[model].count(), 0, `${model} should be rolled back`);
  }
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: "owner" } }))
      .youtubeImports,
    0,
  );
}

test(
  "YouTube import persistence with PrismaPg and isolated PostgreSQL",
  { timeout: 120000 },
  async (t) => {
    // This server is always an ephemeral, local database. Never use DATABASE_URL.
    const pg = await PGlite.create();
    const server = new PGLiteSocketServer({
      db: pg,
      host: "127.0.0.1",
      port: 0,
      maxConnections: 4,
    });
    let pool, db;
    t.after(async () => {
      await db?.$disconnect();
      await pool?.end();
      await server.stop();
      await pg.close();
    });
    for (const directory of fs.readdirSync("prisma/migrations").sort()) {
      const file = path.join("prisma/migrations", directory, "migration.sql");
      if (fs.existsSync(file)) await pg.exec(fs.readFileSync(file, "utf8"));
    }
    // Surface bind errors immediately (including restricted CI sandboxes).
    await new Promise((resolve, reject) => {
      server.addEventListener("error", (event) => reject(event.detail), {
        once: true,
      });
      server.start().then(resolve, reject);
    });
    pool = new Pool({
      connectionString: `postgresql://postgres@${server.getServerConn()}/postgres`,
      max: 4,
      connectionTimeoutMillis: 5000,
    });
    db = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });

    await t.test(
      "timing persists, clears, clones, and replays with the saved missing-duration count",
      async () => {
        await seed(db, true);
        const videos = playlist(3);
        videos.videos[0].videoDurationSeconds = 125;
        videos.videos[1].videoDurationSeconds = 720;
        const f = fixture(db, videos);
        const response = await f.post();
        const body = await response.json();
        assert.equal(response.status, 200, JSON.stringify(body));
        assert.equal(body.missingDurationCount, 1);
        const lessons = await db.lesson.findMany({
          where: { module: { courseId: body.courseId } },
          orderBy: { order: "asc" },
        });
        assert.deepEqual(
          lessons.map((lesson) => lesson.videoDurationSeconds),
          [125, 720, null],
        );
        assert.ok(
          lessons.every((lesson) => lesson.estimatedCompletionSeconds === null),
        );
        await db.lesson.update({
          where: { id: lessons[0].id },
          data: { estimatedCompletionSeconds: 1800 },
        });
        await db.lesson.update({
          where: { id: lessons[0].id },
          data: { lessonName: "Renamed" },
        });
        const saved = await db.lesson.findUniqueOrThrow({
          where: { id: lessons[0].id },
        });
        assert.equal(saved.estimatedCompletionSeconds, 1800);
        assert.equal(saved.videoDurationSeconds, 125);
        await assert.rejects(
          db.lesson.update({
            where: { id: saved.id },
            data: { videoDurationSeconds: 0 },
          }),
        );
        await assert.rejects(
          db.lesson.update({
            where: { id: saved.id },
            data: { estimatedCompletionSeconds: -1 },
          }),
        );

        await db.course.update({
          where: { id: body.courseId },
          data: { isPublic: true, shareSlug: "timed-course" },
        });
        const clone = load("app/api/public/[slug]/clone/route.ts", {
          "@/lib/prisma": { db },
          "@/lib/launch-access": {
            sessionUserId: async () => "owner",
            allowRequest: async () => true,
            launchError: (error) => {
              throw error;
            },
          },
          "next/cache": { revalidateTag() {} },
        });
        const cloned = await clone.POST(
          new Request("https://lessonmap.org/api/public/timed-course/clone", {
            method: "POST",
            headers: { Origin: "https://lessonmap.org" },
          }),
          { params: Promise.resolve({ slug: "timed-course" }) },
        );
        const clonedBody = await cloned.json();
        assert.equal(cloned.status, 200, JSON.stringify(clonedBody));
        const clonedLessons = await db.lesson.findMany({
          where: { module: { courseId: clonedBody.courseId } },
          orderBy: { order: "asc" },
        });
        assert.equal(clonedLessons[0].estimatedCompletionSeconds, 1800);
        assert.equal(clonedLessons[0].videoDurationSeconds, 125);
        assert.deepEqual(
          clonedLessons.map((lesson) => lesson.videoDurationSeconds),
          [125, 720, null],
        );

        await db.lesson.update({
          where: { id: saved.id },
          data: { videoDurationSeconds: null },
        });
        const replay = await (await f.post()).json();
        assert.equal(replay.courseId, body.courseId);
        assert.equal(replay.missingDurationCount, 2);
        assert.equal(f.fetches(), 1);
      },
    );

    await t.test("original nested create reproduction", async (t) => {
      await seed(db);
      const original = playlist(2);
      let failure;
      try {
        await db.$transaction(
          async (tx) => {
            await tx.course.create({
              data: {
                userId: "owner",
                courseName: original.title,
                description: original.description,
                Module: {
                  create: {
                    moduleName: original.title,
                    description: "YouTube playlist",
                    order: 1,
                    Lesson: {
                      create: original.videos.map((video, index) => ({
                        lessonName: video.title,
                        description: video.description,
                        order: index + 1,
                        resources: {
                          create: {
                            name: "Watch on YouTube",
                            type: "Link",
                            url: `https://www.youtube.com/watch?v=${video.videoId}`,
                          },
                        },
                      })),
                    },
                  },
                },
              },
            });
            // Even a successful reproduction attempt must not leave test data.
            throw new Error("ROLLBACK_REPRODUCTION");
          },
          { timeout: 30000 },
        );
      } catch (error) {
        failure = error;
      }
      if (failure.message === "ROLLBACK_REPRODUCTION")
        t.diagnostic(
          "Original nested create succeeded locally; the production failure was not reproduced.",
        );
      else {
        assert.equal(failure.code, "P2003");
        t.diagnostic(
          "Original nested create reproduced the foreign-key failure.",
        );
      }
      await assertEmptyImport(db);
    });

    for (const size of [1, 3, 500]) {
      await t.test(
        `imports ${size} videos with correct lesson links and order`,
        async () => {
          await seed(db, true);
          const f = fixture(db, playlist(size));
          const response = await f.post();
          const body = await response.json();
          assert.equal(
            response.status,
            200,
            JSON.stringify({ body, logs: f.logs }),
          );
          assert.equal(body.skipped, 2);
          const course = await db.course.findUniqueOrThrow({
            where: { id: body.courseId },
            include: {
              Module: {
                include: {
                  Lesson: {
                    orderBy: { order: "asc" },
                    include: { resources: true },
                  },
                },
              },
            },
          });
          assert.equal(course.courseName, "Imported course");
          assert.equal(course.isPublished, false);
          assert.equal(course.Module.length, 1);
          const lessons = course.Module[0].Lesson;
          assert.equal(lessons.length, size);
          for (const [i, lesson] of lessons.entries()) {
            assert.equal(lesson.order, i + 1);
            assert.equal(lesson.lessonName, `Lesson ${i + 1}`);
            assert.equal(lesson.description, `Notes ${i + 1}`);
            assert.equal(lesson.resources.length, 1);
            assert.equal(lesson.resources[0].lessonId, lesson.id);
            assert.equal(lesson.resources[0].type, "Link");
            assert.equal(
              lesson.resources[0].url,
              `https://www.youtube.com/watch?v=video-${i + 1}`,
            );
          }
          assert.equal(await db.playlistImport.count(), 1);
          assert.equal(
            (await db.user.findUniqueOrThrow({ where: { id: "owner" } }))
              .youtubeImports,
            1,
          );
        },
      );
    }

    await t.test(
      "resource foreign-key failure rolls back all rows and reports the failed stage",
      async () => {
        await seed(db);
        // A test-only trigger forces the real constraint to reject a resource.
        await pool.query(`CREATE FUNCTION reject_test_resource() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW."lessonId" := 'missing-lesson'; RETURN NEW; END $$;
      CREATE TRIGGER reject_test_resource BEFORE INSERT ON "Resource" FOR EACH ROW EXECUTE FUNCTION reject_test_resource();`);
        const f = fixture(db, playlist(3));
        try {
          const response = await f.post();
          const body = await response.json();
          assert.equal(response.status, 500);
          assert.equal(body.code, "COURSE_RELATIONSHIP_FAILED");
          assert.equal(body.requestId, "00000000-0000-4000-8000-000000000001");
          assert.equal(f.logs[0][1].stage, "create_resources");
          assert.equal(f.logs[0][1].databaseCode, "P2003");
          assert.equal(f.logs[0][1].constraint, "Resource_lessonId_fkey");
          assert.ok(!JSON.stringify(f.logs).includes("missing-lesson"));
          await assertEmptyImport(db);
        } finally {
          await pool.query(
            'DROP TRIGGER reject_test_resource ON "Resource"; DROP FUNCTION reject_test_resource()',
          );
        }
        assert.equal(
          (await f.post()).status,
          200,
          "the same request can succeed after rollback",
        );
      },
    );

    await t.test(
      "failure after import recording rolls back the import and usage",
      async () => {
        await seed(db);
        await pool.query(`CREATE FUNCTION reject_test_usage() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'test failure' USING ERRCODE = '40001'; END $$;
      CREATE TRIGGER reject_test_usage AFTER UPDATE OF "youtubeImports" ON "user" FOR EACH ROW EXECUTE FUNCTION reject_test_usage();`);
        const f = fixture(db, playlist(2));
        try {
          const response = await f.post();
          assert.equal(response.status, 409);
          assert.equal(f.logs[0][1].stage, "increment_import_usage");
          await assertEmptyImport(db);
        } finally {
          await pool.query(
            'DROP TRIGGER reject_test_usage ON "user"; DROP FUNCTION reject_test_usage()',
          );
        }
      },
    );

    await t.test(
      "cache failure preserves committed import and replay charges only once",
      async () => {
        await seed(db);
        const f = fixture(db, playlist(2), { failCache: true });
        const first = await f.post();
        assert.equal(first.status, 200);
        const body = await first.json();
        const replay = await f.post();
        assert.equal(replay.status, 200);
        assert.equal((await replay.json()).courseId, body.courseId);
        assert.equal(f.fetches(), 1);
        assert.equal(await db.course.count(), 1);
        assert.equal(await db.playlistImport.count(), 1);
        assert.equal(
          (await db.user.findUniqueOrThrow({ where: { id: "owner" } }))
            .youtubeImports,
          1,
        );
        assert.equal(f.logs[0][0], "YouTube import cache refresh failed");
        assert.equal((await f.post(undefined, "PLdifferentlist")).status, 409);
      },
    );

    await t.test("concurrent Free imports consume one allowance", async () => {
      await seed(db);
      let fetched = 0,
        release;
      const barrier = new Promise((resolve) => {
        release = resolve;
      });
      const f = fixture(db, playlist(2), {
        fetchBarrier: async () => {
          if (++fetched === 2) release();
          await barrier;
        },
      });
      const responses = await Promise.all([
        f.post(),
        f.post("00000000-0000-4000-8000-000000000002"),
      ]);
      assert.deepEqual(
        responses.map((response) => response.status).sort(),
        [200, 403],
      );
      assert.equal(await db.course.count(), 1);
      assert.equal(await db.playlistImport.count(), 1);
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: "owner" } }))
          .youtubeImports,
        1,
      );
    });
  },
);

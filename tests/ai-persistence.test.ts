import { after, test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { createAiCourse, editAiCourse } from "../lib/ai/service";
import { aiFailure } from "../lib/ai/failure";
import { AiError } from "../lib/ai/http";
import type { GeneratedCourse } from "../lib/ai/schema";

// Opt in with a disposable PostgreSQL database initialized from schema.prisma.
// AI responses are fixtures; these tests never contact DeepSeek.
const connectionString = process.env.AI_TEST_DATABASE_URL;
const database = connectionString
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) }) : null;
const integration = { skip: !database && "Set AI_TEST_DATABASE_URL to run PostgreSQL integration tests" };
after(async () => { await database?.$disconnect(); });

function generatedCourse(moduleCount: number, lessonsPerModule: number): GeneratedCourse {
  return {
    courseName: "Data structures and algorithms",
    description: "A complete course for beginning computer science learners.",
    modules: Array.from({ length: moduleCount }, (_, index) => ({
      moduleName: `Module ${index + 1}`,
      description: "A module description with concrete learning objectives.",
      lessons: Array.from({ length: lessonsPerModule }, (_, lesson) => ({
        lessonName: `Module ${index + 1} lesson ${lesson + 1}`,
      })),
    })),
  };
}

function mockProvider(t: TestContext, course: GeneratedCourse) {
  const previousKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-placeholder";
  t.after(() => {
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = previousKey;
  });
  return t.mock.method(globalThis, "fetch", async (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const { messages } = JSON.parse(String(init?.body));
    const input = JSON.parse(messages[1].content);
    const batch = Array.isArray(input) ? input : input.modules;
    const value = batch
      ? { modules: batch.map((module: { moduleName: string }) => ({
        moduleName: module.moduleName,
        lessons: course.modules.find((candidate) => candidate.moduleName === module.moduleName)!.lessons,
      })) }
      : String(messages[0].content).includes("no lesson objects at this step")
        ? { ...course, modules: course.modules.map(({ lessons: _lessons, ...module }) => module) }
        : course;
    return Response.json({
      choices: [{ finish_reason: "stop", message: { content: JSON.stringify(value) } }],
      usage: { prompt_tokens: 20, completion_tokens: 40 },
    });
  });
}

async function fixture(t: TestContext) {
  const db = database!;
  const user = await db.user.create({ data: {
    name: "AI persistence test", email: `${randomUUID()}@example.test`,
    plan: "CREATOR", subscriptionStatus: "active",
  } });
  t.after(async () => {
    await db.course.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  });
  return { db, userId: user.id };
}

function generationInput(moduleCount: number, lessonsPerModule: number) {
  return {
    requestId: randomUUID(), type: "course" as const, topic: "Algorithms", audience: "Beginners",
    moduleCount, lessonsPerModule,
  };
}

async function readCourse(courseId: string) {
  return database!.course.findUniqueOrThrow({
    where: { id: courseId },
    include: { Module: { orderBy: { order: "asc" }, include: {
      Lesson: { orderBy: { order: "asc" }, include: { resources: true } },
    } } },
  });
}

function assertOutline(saved: Awaited<ReturnType<typeof readCourse>>, expected: GeneratedCourse) {
  assert.deepEqual(saved.Module.map((module, moduleIndex) => {
    assert.equal(module.order, moduleIndex + 1);
    assert.equal(module.courseId, saved.id);
    return {
      moduleName: module.moduleName, description: module.description,
      lessons: module.Lesson.map((lesson, lessonIndex) => {
        assert.equal(lesson.order, lessonIndex + 1);
        assert.equal(lesson.moduleId, module.id);
        return { lessonName: lesson.lessonName };
      }),
    };
  }), expected.modules);
}

// Force a real PostgreSQL foreign-key error after the course/modules were saved.
// This exercises rollback and error classification through the actual adapter.
function failLessonWrite(db: PrismaClient) {
  return db.$extends({ query: { lesson: { async createMany({ args, query }) {
    const rows = Array.isArray(args.data) ? args.data : [args.data];
    return query({ ...args, data: rows.map((row) => ({ ...row, moduleId: "missing-test-module" })) });
  } } } }) as unknown as PrismaClient;
}

for (const [moduleCount, lessonsPerModule] of [[1, 1], [10, 1], [10, 9], [50, 1], [1, 99], [25, 5], [75, 1], [1, 149]]) {
  test(`saves and replays a ${moduleCount} × ${lessonsPerModule} private AI course`, integration, async (t) => {
    const { db, userId } = await fixture(t);
    const expected = generatedCourse(moduleCount, lessonsPerModule);
    const provider = mockProvider(t, expected);
    const input = generationInput(moduleCount, lessonsPerModule);
    const result = await createAiCourse(userId, input, db);
    const saved = await readCourse(result.courseId);
    assert.equal(saved.userId, userId);
    assert.equal(saved.isPublic, false);
    assert.equal(saved.isPublished, false);
    assertOutline(saved, expected);
    const calls = provider.mock.callCount();
    assert.deepEqual(await createAiCourse(userId, input, db), { ...result, replayed: true });
    assert.equal(provider.mock.callCount(), calls);
    assert.equal(await db.course.count({ where: { userId } }), 1);
    assert.equal(await db.aiGeneration.count({ where: { userId, status: "SUCCEEDED" } }), 1);
  });
}

test("a larger generation can save after the previous three-minute expiry", integration, async (t) => {
  const { db, userId } = await fixture(t);
  const expected = generatedCourse(25, 5);
  const provider = mockProvider(t, expected);
  let advanced = false;
  t.mock.method(globalThis, "fetch", async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
    if (!advanced) {
      advanced = true;
      // Simulate 200 seconds spent generating without actually waiting or
      // changing the database/system clock for unrelated tests.
      await db.aiGeneration.updateMany({ where: { userId, status: "PENDING" },
        data: { createdAt: new Date(Date.now() - 200_000) },
      });
    }
    return provider(url, init);
  });
  const result = await createAiCourse(userId, generationInput(25, 5), db);
  assertOutline(await readCourse(result.courseId), expected);
});

test("a foreign-key failure rolls back the course, refunds the attempt, and allows a fresh retry", integration, async (t) => {
  const { db, userId } = await fixture(t);
  mockProvider(t, generatedCourse(10, 1));
  const log = t.mock.method(console, "error", () => {});
  const input = generationInput(10, 1);
  await assert.rejects(createAiCourse(userId, input, failLessonWrite(db)), asyncError => {
    assert.ok(asyncError instanceof AiError);
    assert.equal(asyncError.status, 500);
    assert.equal(asyncError.newRequest, true);
    assert.doesNotMatch(asyncError.message, /sign in|session/i);
    return true;
  });
  assert.equal(await db.course.count({ where: { userId } }), 0);
  const attempt = await db.aiGeneration.findFirstOrThrow({ where: { userId } });
  assert.equal(attempt.status, "FAILED");
  assert.ok(attempt.completionTokens > 0);
  assert.equal(await db.aiGeneration.count({ where: { userId, status: { not: "FAILED" } } }), 0);
  assert.equal(log.mock.calls[0].arguments[1].code, "P2003");
  assert.equal(log.mock.calls[0].arguments[1].constraint, "Lesson_moduleId_fkey");
  const retried = await createAiCourse(userId, { ...input, requestId: randomUUID() }, db);
  assert.equal((await readCourse(retried.courseId)).Module.length, 10);
});

test("an unconfirmed failure keeps the request ID and does not claim a refund", integration, async (t) => {
  const { db, userId } = await fixture(t);
  const provider = mockProvider(t, generatedCourse(10, 1));
  t.mock.method(console, "error", () => {});
  const failing = failLessonWrite(db).$extends({ query: { aiGeneration: {
    async updateMany() { throw new Error("Database unavailable during failure recording"); },
  } } }) as unknown as PrismaClient;
  const input = generationInput(10, 1);
  let response: Response | undefined;
  await assert.rejects(createAiCourse(userId, input, failing), (error) => {
    response = aiFailure(error);
    return true;
  });
  assert.ok(response);
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.notEqual(body.newRequest, true);
  assert.doesNotMatch(body.error, /not deducted|sign in|session/i);
  assert.equal(await db.course.count({ where: { userId } }), 0);
  assert.equal(await db.aiGeneration.count({ where: { userId, status: "PENDING" } }), 1);
  const calls = provider.mock.callCount();
  await assert.rejects(createAiCourse(userId, input, db), (error) => {
    assert.ok(error instanceof AiError);
    assert.equal(error.status, 409);
    assert.equal(error.newRequest, false);
    return true;
  });
  assert.equal(provider.mock.callCount(), calls);
});

for (const failSave of [false, true]) {
  test(`AI revision ${failSave ? "preserves the old outline and resources on failure" : "saves 25 modules and 125 lessons and replays once"}`, integration, async (t) => {
    const { db, userId } = await fixture(t);
    const initial = await db.course.create({ data: {
      userId, courseName: "Original course", description: "The original course description.",
      Module: { create: { moduleName: "Original module", description: "Original description", order: 1,
        Lesson: { create: { lessonName: "Original lesson", order: 1,
          resources: { create: { name: "Original resource", type: "Note", content: "Keep on rollback" } },
        } },
      } },
    } });
    const before = await readCourse(initial.id);
    const expected = generatedCourse(25, 5);
    const provider = mockProvider(t, expected);
    const input = { requestId: randomUUID(), courseId: initial.id, instructions: "Expand this course",
      moduleCount: 25, lessonsPerModule: 5, rewriteMeta: true };
    if (failSave) {
      t.mock.method(console, "error", () => {});
      await assert.rejects(editAiCourse(userId, input, failLessonWrite(db)), (error) => {
        assert.ok(error instanceof AiError);
        assert.equal(aiFailure(error).status, 500);
        assert.equal(error.newRequest, true);
        return true;
      });
      assert.deepEqual(await readCourse(initial.id), before);
      assert.equal(await db.aiGeneration.count({ where: { userId, status: "FAILED" } }), 1);
    } else {
      const result = await editAiCourse(userId, input, db);
      const saved = await readCourse(initial.id);
      assert.equal(saved.courseName, expected.courseName);
      assertOutline(saved, expected);
      const calls = provider.mock.callCount();
      assert.deepEqual(await editAiCourse(userId, input, db), { ...result, replayed: true });
      assert.equal(provider.mock.callCount(), calls);
    }
  });
}

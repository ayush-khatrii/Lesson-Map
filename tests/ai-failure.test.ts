import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "../app/generated/prisma/client";
import { aiFailure } from "../lib/ai/failure";
import { AiError } from "../lib/ai/http";
import { effectiveAiPlan, generateCourseSchema, reviseCourseSchema } from "../lib/ai/schema";
import { assertPlanAllows } from "../lib/ai/service";

test("foreign-key failures are logged as database errors, never expired sessions", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const response = aiFailure(new Prisma.PrismaClientKnownRequestError("private SQL parameters", {
    code: "P2003",
    clientVersion: "7.8.0",
    meta: {
      modelName: "Lesson",
      driverAdapterError: {
        cause: {
          constraint: { index: "Lesson_moduleId_fkey" },
          originalMessage: "private generated content",
        },
      },
    },
  }));
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.doesNotMatch(body.error, /session|sign in/i);
  // An unconfirmed failure must keep the same request ID to avoid duplicates.
  assert.notEqual(body.newRequest, true);
  assert.equal(log.mock.callCount(), 1);
  assert.equal(log.mock.calls[0].arguments[1].constraint, "Lesson_moduleId_fkey");
  assert.doesNotMatch(JSON.stringify(log.mock.calls[0].arguments), /private/);
  assert.doesNotMatch(JSON.stringify(body), /P2003|Lesson_moduleId|private/);
});

test("real authentication failures and retry instructions retain their status", async () => {
  const unauthenticated = aiFailure(new AiError(401, "Please sign in first."));
  assert.equal(unauthenticated.status, 401);
  const pending = aiFailure(new AiError(409, "Still generating.", 10));
  assert.equal(pending.status, 409);
  assert.equal(pending.headers.get("Retry-After"), "10");
  assert.equal((await pending.json()).newRequest, false);
  const failed = aiFailure(new AiError(500, "Save failed.", undefined, true));
  assert.equal((await failed.json()).newRequest, true);
});

test("larger paid outlines do not bypass the Free plan restriction", () => {
  const shape = { moduleCount: 25, lessonsPerModule: 5 };
  assert.doesNotThrow(() => assertPlanAllows("CREATOR", shape));
  assert.doesNotThrow(() => assertPlanAllows("PROFESSIONAL", shape));
  assert.throws(() => assertPlanAllows("FREE", shape), (error) => {
    assert.ok(error instanceof AiError);
    assert.equal(error.status, 403);
    return true;
  });
});

test("paid access ends immediately when cancellation is requested", () => {
  const active = {
    plan: "CREATOR" as const,
    subscriptionStatus: "active",
    subscriptionCancelAtPeriodEnd: false,
    subscriptionCurrentPeriodEnd: new Date("2027-01-01T00:00:00.000Z"),
  };
  assert.equal(effectiveAiPlan(active), "CREATOR");
  assert.equal(effectiveAiPlan({ ...active, subscriptionCancelAtPeriodEnd: true }), "FREE");
  assert.equal(effectiveAiPlan({
    ...active,
    subscriptionStatus: "cancelled",
    subscriptionCancelAtPeriodEnd: true,
  }), "FREE");
});

for (const [moduleCount, lessonsPerModule, allowed] of [
  [10, 1, true], [10, 9, true], [50, 1, true], [1, 99, true], [10, 10, true], [50, 2, true],
  [25, 5, true], [26, 5, false], [25, 6, false], [75, 1, true], [76, 1, false],
  [1, 149, true], [1, 150, false],
] as const) {
  test(`generation and revision enforce the combined limit for ${moduleCount} × ${lessonsPerModule}`, () => {
    const size = { requestId: "11111111-1111-4111-8111-111111111111", moduleCount, lessonsPerModule };
    for (const result of [
      generateCourseSchema.safeParse({ ...size, type: "course", topic: "Algorithms", audience: "Beginners" }),
      reviseCourseSchema.safeParse({ ...size, courseId: "course-1", instructions: "Explain the basics" }),
    ]) {
      assert.equal(result.success, allowed);
      if (!result.success) assert.match(result.error.issues[0].message, /150 total modules and lessons/);
    }
  });
}

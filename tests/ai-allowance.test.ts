import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as schema from "../lib/ai/schema";
import { COURSE_LIMITS, hasReachedCourseLimit } from "../lib/plans";
import { AiError } from "../lib/ai/http";

const source = ts.transpileModule(readFileSync("lib/ai/service.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function fixture(plan: schema.AiPlan, records: { status: string; createdAt: Date }[] = [], courseCount = 0) {
  const user = { plan, subscriptionStatus: "active", subscriptionCancelAtPeriodEnd: false, subscriptionCurrentPeriodEnd: null };
  const filters: any[] = [];
  const db: any = {
    user: { findUnique: async () => user },
    course: { count: async () => courseCount },
    aiGeneration: {
      findUnique: async () => null,
      findFirst: async () => null,
      count: async ({ where }: any) => {
        filters.push(where);
        return records.filter(r => r.status !== where.status.not && (!where.createdAt || (r.createdAt >= where.createdAt.gte && r.createdAt < where.createdAt.lt))).length;
      },
    },
  };
  db.$transaction = (callback: any) => callback(db);
  const module = { exports: {} as any };
  vm.runInNewContext(source, {
    module, exports: module.exports, Date, console, process: { env: { DEEPSEEK_API_KEY: "test" } },
    require(id: string) {
      if (id === "node:crypto") return require(id);
      if (id === "@/lib/prisma") return { db };
      if (id === "@/lib/course-access") return { lockCourseOwner: async () => user };
      if (id === "./schema") return schema;
      if (id === "./http") return { AiError };
      if (id === "@/lib/plans") return { COURSE_LIMITS, hasReachedCourseLimit };
      return {};
    },
  });
  return { service: module.exports, db, filters };
}

test("Free can request a complete multi-module outline within the safety cap", () => {
  assert.equal(schema.AI_LIMITS.FREE.generations, 1);
  assert.equal(schema.AI_LIMITS.FREE.period, "lifetime");
  assert.equal(schema.AI_LIMITS.FREE.modules, null);
  assert.equal(schema.AI_LIMITS.FREE.lessonsPerModule, null);
  assert.equal(schema.generateCourseSchema.safeParse({
    requestId: "11111111-1111-4111-8111-111111111111", type: "course", topic: "Computer science", audience: "Beginners", moduleCount: 6, lessonsPerModule: 3,
  }).success, true);
});

test("Free lifetime usage survives month changes and course deletion", async () => {
  const f = fixture("FREE", [{ status: "SUCCEEDED", createdAt: new Date("2020-01-01") }], 0);
  const allowance = await f.service.getAiAllowance("user");
  assert.equal(allowance.remaining, 0);
  assert.equal(allowance.resetsAt, null);
  assert.equal(f.filters[0].createdAt, undefined);
  await assert.rejects(f.service.createAiCourse("user", {
    requestId: "new-request", moduleCount: 6, lessonsPerModule: 3,
  }, f.db), /complimentary AI outline has been used/);
});

test("failed Free generation is retryable; pending work reserves the trial", async () => {
  const failed = fixture("FREE", [{ status: "FAILED", createdAt: new Date() }]);
  assert.equal((await failed.service.getAiAllowance("user")).remaining, 1);
  const pending = fixture("FREE", [{ status: "PENDING", createdAt: new Date() }]);
  assert.equal((await pending.service.getAiAllowance("user")).remaining, 0);
});

test("AI generation cannot create a fourth Free course even with unused trial", async () => {
  const f = fixture("FREE", [], 3);
  await assert.rejects(f.service.createAiCourse("user", {
    requestId: "new-request", moduleCount: 6, lessonsPerModule: 3,
  }, f.db), /limit of 3 courses/);
});

test("paid allowances remain monthly and ignore previous months and failed attempts", async () => {
  for (const plan of ["CREATOR", "PROFESSIONAL"] as const) {
    const f = fixture(plan, [
      { status: "SUCCEEDED", createdAt: new Date("2020-01-01") },
      { status: "SUCCEEDED", createdAt: new Date() },
      { status: "FAILED", createdAt: new Date() },
    ]);
    const allowance = await f.service.getAiAllowance("user");
    assert.equal(allowance.remaining, 199);
    assert.equal(typeof allowance.resetsAt, "string");
  }
});

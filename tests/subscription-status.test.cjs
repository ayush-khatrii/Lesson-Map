const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function getStatus(user) {
  const module = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../app/api/subscription/status/route.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require(id) {
      if (id === "@/lib/auth") return { auth: { api: { getSession: async () => ({ session: { userId: "user-1" } }) } } };
      if (id === "@/lib/prisma") return { db: { user: { findUnique: async () => user } } };
      if (id === "next/headers") return { headers: async () => new Headers() };
      if (id === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (id === "@/lib/ai/schema") return require("./helpers/ai-schema.cjs");
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return module.exports.GET();
}

test("subscription status preserves paid access while cancellation is scheduled", async () => {
  const account = {
    plan: "CREATOR",
    subscriptionId: "sub-1",
    subscriptionStatus: "active",
    subscriptionCurrentPeriodEnd: new Date(Date.now() + 86400000),
    subscriptionCancelAtPeriodEnd: true,
  };
  const response = await getStatus(account);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.plan, "CREATOR");
  assert.equal(body.subscriptionCancelAtPeriodEnd, true);
});

for (const periodEnd of [null, new Date(0), new Date("invalid")]) {
  test(`scheduled cancellation without a future paid period exposes Free: ${periodEnd}`, async () => {
    const response = await getStatus({ plan: "CREATOR", subscriptionStatus: "active",
      subscriptionCancelAtPeriodEnd: true, subscriptionCurrentPeriodEnd: periodEnd });
    assert.equal((await response.json()).plan, "FREE");
  });
}

const { effectiveAiPlan } = require("./helpers/ai-schema.cjs");

test("scheduled cancellation ends exactly at the billing boundary without a webhook", (t) => {
  const now = new Date("2030-01-01T00:00:00Z");
  t.mock.method(Date, "now", () => now.getTime());
  for (const offset of [-1, 0, 1]) {
    assert.equal(effectiveAiPlan({ plan: "CREATOR", subscriptionStatus: "active",
      subscriptionCancelAtPeriodEnd: true,
      subscriptionCurrentPeriodEnd: new Date(now.getTime() + offset),
    }), offset > 0 ? "CREATOR" : "FREE");
  }
  assert.equal(effectiveAiPlan({ plan: "FREE", subscriptionStatus: "active",
    subscriptionCancelAtPeriodEnd: true,
    subscriptionCurrentPeriodEnd: new Date(now.getTime() + 1000),
  }), "FREE");
});

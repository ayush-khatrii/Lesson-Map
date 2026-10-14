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
      if (id === "@/lib/ai/schema") return { effectiveAiPlan: (account) =>
        account.plan !== "FREE" && account.subscriptionStatus === "active" &&
          !account.subscriptionCancelAtPeriodEnd ? account.plan : "FREE" };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return module.exports.GET();
}

test("subscription status never exposes paid access after cancellation is requested", async () => {
  const account = {
    plan: "CREATOR",
    subscriptionId: "sub-1",
    subscriptionStatus: "active",
    subscriptionCurrentPeriodEnd: new Date("2027-01-01T00:00:00.000Z"),
    subscriptionCancelAtPeriodEnd: true,
  };
  const response = await getStatus(account);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.plan, "FREE");
  assert.equal(body.subscriptionCancelAtPeriodEnd, true);
});

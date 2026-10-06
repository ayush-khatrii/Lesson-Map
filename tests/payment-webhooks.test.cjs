const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { Webhook } = require("standardwebhooks");

function fixture() {
  const secret = Buffer.from("local-test-webhook-signing-secret").toString("base64");
  const user = {
    id: "user-1", plan: "FREE", subscriptionId: null, customerId: null,
    subscriptionStatus: null, subscriptionCancelAtPeriodEnd: false,
    subscriptionCurrentPeriodEnd: null,
  };
  const events = new Map();
  const tx = {
    user: {
      findFirst: async ({ where }) => where.id === user.id ? { ...user } : null,
      update: async ({ data }) => Object.assign(user, data),
    },
    webhookEvent: {
      findUnique: async ({ where }) => events.get(where.id) ?? null,
      create: async ({ data }) => events.set(data.id, data),
    },
    $queryRaw: async () => [],
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../app/api/webhooks/dodopayments/route.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports,
    process: { env: { DODO_PAYMENTS_WEBHOOK_SECRET: secret } },
    console: { info() {}, error() {}, warn() {} },
    require(id) {
      if (id === "standardwebhooks") return { Webhook };
      if (id === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (id === "@/lib/payments/config") return { productIdForPlan: (plan) => plan === "CREATOR" ? "pdt_creator" : "pdt_pro" };
      if (id === "@/lib/ai/schema") return { effectiveAiPlan: (user) =>
        user.plan !== "FREE" && (user.subscriptionStatus === "active" ||
          (user.subscriptionStatus === "cancelled" && user.subscriptionCancelAtPeriodEnd &&
            user.subscriptionCurrentPeriodEnd > new Date())) ? user.plan : "FREE" };
      if (id === "@/lib/prisma") return { db: { $transaction: async (callback) => callback(tx) } };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  async function deliver(type = "subscription.active", id = "event-1", invalid = false, overrides = {}) {
    const body = JSON.stringify({ type, data: {
      subscription_id: "sub-1", product_id: "pdt_creator", status: "active",
      customer: { customer_id: "customer-1" }, metadata: { userId: "user-1" },
      ...overrides,
    } });
    const now = new Date();
    const headers = new Headers({
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(now.getTime() / 1000)),
      "webhook-signature": invalid ? "v1,invalid" : new Webhook(secret).sign(id, now, body),
    });
    return module.exports.POST({ headers, text: async () => body });
  }
  return { user, events, deliver };
}

test("a signed activation grants the purchased plan and a repeated delivery is ignored", async () => {
  const { deliver, user, events } = fixture();
  assert.equal((await deliver()).status, 200);
  assert.equal(user.plan, "CREATOR");
  assert.equal(user.subscriptionId, "sub-1");
  assert.equal(user.subscriptionStatus, "active");
  assert.equal((await (await deliver()).json()).processed, false);
  assert.equal(events.size, 1);
});

test("an invalid signature cannot grant paid access", async () => {
  const { deliver, user, events } = fixture();
  assert.equal((await deliver("subscription.active", "event-1", true)).status, 401);
  assert.equal(user.plan, "FREE");
  assert.equal(events.size, 0);
});

test("an unknown product cannot grant paid access", async () => {
  const { deliver, user } = fixture();
  assert.equal((await deliver("subscription.active", "event-1", false, { product_id: "unknown" })).status, 500);
  assert.equal(user.plan, "FREE");
});

test("a signed subscription failure revokes paid access", async () => {
  const { deliver, user } = fixture();
  await deliver();
  assert.equal((await deliver("subscription.failed", "event-2", false, { status: "failed" })).status, 200);
  assert.equal(user.plan, "FREE");
  assert.equal(user.subscriptionStatus, "failed");
});

test("an old subscription event cannot revoke a user's replacement subscription", async () => {
  const { deliver, user } = fixture();
  await deliver();
  user.subscriptionId = "sub-replacement";
  user.plan = "PROFESSIONAL";
  assert.equal((await deliver("subscription.failed", "event-2", false, {
    subscription_id: "sub-1",
  })).status, 200);
  assert.equal(user.plan, "PROFESSIONAL");
  assert.equal(user.subscriptionId, "sub-replacement");
});

test("a second active subscription cannot replace the account's current one", async () => {
  const { deliver, user } = fixture();
  user.plan = "CREATOR";
  user.subscriptionId = "sub-existing";
  user.customerId = "customer-1";
  user.subscriptionStatus = "active";
  assert.equal((await deliver("subscription.active", "event-1", false, {
    subscription_id: "sub-another",
  })).status, 500);
  assert.equal(user.plan, "CREATOR");
  assert.equal(user.subscriptionId, "sub-existing");
});

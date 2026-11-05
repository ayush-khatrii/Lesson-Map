const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { Webhook } = require("standardwebhooks");

function fixture(options = {}) {
  const secret = Buffer.from("local-test-webhook-signing-secret").toString("base64");
  const user = {
    id: "user-1", plan: "FREE", subscriptionId: null, customerId: null,
    email: "delivered@resend.dev", name: "Billing Test",
    subscriptionStatus: null, subscriptionCancelAtPeriodEnd: false,
    subscriptionCurrentPeriodEnd: null,
  };
  const events = new Map();
  const emails = [];
  let committed = false;
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
      if (id === "@/lib/ai/schema") return require("./helpers/ai-schema.cjs");
      if (id === "@/lib/email/send") return { sendEmailAction: async (event) => {
        assert.equal(committed, true, "email must follow commit");
        assert.ok(events.size > 0, "deduplication must be persisted before email");
        emails.push(event);
        if (options.emailThrows) throw new Error("Email transport unavailable");
        return options.emailFails ? { status: "failed", reason: "provider_error" } : { status: "sent", id: "test-email" };
      } };
      if (id === "@/lib/prisma") return { db: { $transaction: async (callback) => {
        committed = false;
        const result = await callback(tx);
        if (options.failCommit) throw new Error("Commit failed");
        committed = true;
        return result;
      } } };
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
  return { user, events, deliver, emails };
}

test("activation and renewal email the matched database user only after commit", async () => {
  const { deliver, user, emails } = fixture();
  await deliver("subscription.active", "activation", false, {
    customer: { customer_id: "customer-1", email: "bounced@resend.dev" },
  });
  assert.equal(emails.length, 1);
  assert.equal(emails[0].action, "PURCHASE_ACTIVATED");
  assert.equal(emails[0].to, user.email);
  assert.equal(emails[0].eventId, "sub-1");
  await deliver("subscription.active", "activation");
  assert.equal(emails.length, 1);
  await deliver("subscription.renewed", "renewal-1");
  assert.equal(emails[1].action, "PLAN_RENEWED");
  assert.equal(emails[1].eventId, "renewal-1");
  await deliver("subscription.renewed", "renewal-1");
  assert.equal(emails.length, 2);
  await deliver("subscription.renewed", "renewal-2");
  assert.equal(emails.length, 3);
});

test("activation still emails when checkout recovery already linked the subscription", async () => {
  const { user, deliver, emails } = fixture();
  Object.assign(user, { plan: "CREATOR", subscriptionId: "sub-1", customerId: "customer-1", subscriptionStatus: "active" });
  assert.equal((await deliver()).status, 200);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].action, "PURCHASE_ACTIVATED");
});

test("rejected, rolled-back, unrelated and stale events send no emails", async () => {
  const { deliver, user, emails } = fixture();
  await deliver("subscription.active", "bad-signature", true);
  await deliver("subscription.active", "bad-product", false, { product_id: "unknown" });
  await deliver("payment.succeeded", "payment");
  await deliver("subscription.plan_changed", "plan-change");
  await deliver("subscription.updated", "updated");
  user.subscriptionId = "replacement";
  await deliver("subscription.cancelled", "stale");
  assert.equal(emails.length, 0);
  const failed = fixture({ failCommit: true });
  assert.equal((await failed.deliver()).status, 500);
  assert.equal(failed.emails.length, 0);
});

for (const options of [{ emailFails: true }, { emailThrows: true }]) {
  test(`email failure does not undo billing or cause webhook redelivery: ${JSON.stringify(options)}`, async () => {
    const { deliver, user, emails, events } = fixture(options);
    assert.equal((await deliver()).status, 200);
    assert.equal(user.plan, "CREATOR");
    assert.equal(events.size, 1);
    assert.equal((await deliver()).status, 200);
    assert.equal(emails.length, 1);
  });
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

test("a terminal cancellation revokes paid access even with a future billing date", async () => {
  const { deliver, user } = fixture();
  await deliver();
  const futurePeriodEnd = "2026-12-01T00:00:00.000Z";
  assert.equal((await deliver("subscription.cancelled", "event-2", false, {
    status: "cancelled",
    cancel_at_next_billing_date: true,
    next_billing_date: futurePeriodEnd,
  })).status, 200);
  assert.equal(user.plan, "FREE");
  assert.equal(user.subscriptionStatus, "cancelled");
  assert.equal(user.subscriptionCancelAtPeriodEnd, true);
  assert.equal(user.subscriptionCurrentPeriodEnd.toISOString(), futurePeriodEnd);
});

test("scheduling cancellation through a subscription update preserves paid access", async () => {
  const { deliver, user } = fixture();
  await deliver();
  assert.equal((await deliver("subscription.updated", "event-2", false, {
    status: "active",
    cancel_at_next_billing_date: true,
    next_billing_date: "2026-12-01T00:00:00.000Z",
  })).status, 200);
  assert.equal(user.plan, "CREATOR");
  assert.equal(user.subscriptionStatus, "active");
  assert.equal(user.subscriptionCancelAtPeriodEnd, true);
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

test("cancellation scheduling, partial updates, reversal and expiry preserve the correct access", async () => {
  const { deliver, user } = fixture();
  const next_billing_date = new Date(Date.now() + 86400000).toISOString();
  await deliver("subscription.active", "active", false, { next_billing_date });
  const scheduled = { cancel_at_next_billing_date: true, next_billing_date };
  await deliver("subscription.updated", "schedule", false, scheduled);
  assert.equal(user.plan, "CREATOR");
  assert.equal((await (await deliver("subscription.updated", "schedule", false, scheduled)).json()).processed, false);
  await deliver("subscription.updated", "partial", false, { status: undefined });
  assert.equal(user.subscriptionCancelAtPeriodEnd, true);
  assert.equal(user.subscriptionCurrentPeriodEnd.toISOString(), next_billing_date);
  assert.equal(user.plan, "CREATOR");
  await deliver("subscription.updated", "reverse", false, { cancel_at_next_billing_date: false });
  assert.equal(user.plan, "CREATOR");
  assert.equal(user.subscriptionCancelAtPeriodEnd, false);
  await deliver("subscription.expired", "expired", false, { status: "expired" });
  assert.equal(user.plan, "FREE");
});

test("activation with scheduled cancellation keeps the purchased plan", async () => {
  const { deliver, user } = fixture();
  await deliver("subscription.active", "active", false, {
    cancel_at_next_billing_date: true,
    next_billing_date: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(user.plan, "CREATOR");
  assert.equal(require("./helpers/ai-schema.cjs").effectiveAiPlan(user), "CREATOR");
});

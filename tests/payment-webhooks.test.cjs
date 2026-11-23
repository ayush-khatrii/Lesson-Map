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
  const pendingEmails = new Map();
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
    process: { env: { DODO_PAYMENTS_ENVIRONMENT: options.environment ?? "test_mode", DODO_PAYMENTS_WEBHOOK_SECRET: secret } },
    console: { info() {}, error() {}, warn() {} },
    require(id) {
      if (id === "standardwebhooks") return { Webhook };
      if (id === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (id === "@/lib/payments/config") return { paymentCredentials: () => ({ apiKey: "test", environment: "test_mode" }), productIdForPlan: (plan) => plan === "CREATOR" ? "pdt_creator" : "pdt_pro" };
      if (id === "@/lib/ai/schema") return require("./helpers/ai-schema.cjs");
      if (id === "@/lib/payments/dodopayments") return { createDodoPayments: () => ({ subscriptions: { retrieve: async () => options.providerSubscription ?? { customer: { customer_id: "customer-1" }, product_id: "pdt_creator", next_billing_date: "2099-12-01T00:00:00Z" } } }) };
      if (id === "@/lib/payments/billing-email") return {
        queueBillingEmail: async (_tx, job) => { if (!pendingEmails.has(job.id)) pendingEmails.set(job.id, job); },
        deliverBillingEmails: async (ids) => {
          assert.equal(committed, true, "email must follow commit");
          for (const id of ids) {
            const job = pendingEmails.get(id);
            if (job.completed) continue;
            emails.push(job.event);
            if (options.emailThrows) throw new Error("Email transport unavailable");
            if (!options.emailFails) job.completed = true;
          }
        },
      };
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
  return { user, events, deliver, emails, pendingEmails };
}

for (const [environment, expected] of [["test_mode", "TEST"], ["live_mode", "LIVE"]]) {
  test(`verified activation records ${environment} billing provenance`, async () => {
    const h = fixture({ environment });
    assert.equal((await h.deliver("subscription.active", "activation")).status, 200);
    assert.equal(h.user.paymentEnvironment, expected);
  });
}

test("invalid billing mode cannot classify or activate a subscription", async () => {
  const h = fixture({ environment: "invalid" });
  assert.equal((await h.deliver("subscription.active", "activation")).status, 500);
  assert.equal(h.user.plan, "FREE");
  assert.equal(h.events.size, 0);
});

test("successful payments queue one receipt after commit while subscription events do not duplicate billing emails", async () => {
  const { deliver, user, emails, pendingEmails } = fixture();
  await deliver();
  await deliver("subscription.renewed", "renewal");
  assert.equal(emails.length, 0);
  const payment = { payment_id: "pay_first", status: "succeeded" };
  assert.equal((await deliver("payment.succeeded", "payment1", false, payment)).status, 200);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].action, "PAYMENT_RECEIPT");
  assert.equal(emails[0].to, user.email);
  await deliver("payment.succeeded", "payment2", false, payment);
  assert.equal(emails.length, 1);
  assert.equal(pendingEmails.size, 1);
  await deliver("payment.succeeded", "payment3", false, { ...payment, payment_id: "pay_renewal" });
  assert.equal(emails.length, 2);
});

test("rejected, rolled-back, unrelated and stale events send no emails", async () => {
  const { deliver, user, emails } = fixture();
  await deliver("subscription.active", "bad-signature", true);
  await deliver("subscription.active", "bad-product", false, { product_id: "unknown" });
  await deliver("payment.succeeded", "payment", false, { subscription_id: undefined, metadata: {} });
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
  test(`email failure retains a receipt job without undoing access: ${JSON.stringify(options)}`, async () => {
    const { deliver, user, emails, pendingEmails } = fixture(options);
    await deliver();
    assert.equal((await deliver("payment.succeeded", "paid", false, { payment_id: "pay_first", status: "succeeded" })).status, 200);
    assert.equal(user.plan, "CREATOR");
    assert.equal(emails.length, 1);
    assert.equal([...pendingEmails.values()][0].completed, undefined);
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

test("cancellation preserves paid access until the future billing date", async () => {
  const { deliver, user } = fixture();
  await deliver();
  const futurePeriodEnd = "2099-12-01T00:00:00.000Z";
  assert.equal((await deliver("subscription.cancelled", "event-2", false, {
    status: "cancelled",
    cancel_at_next_billing_date: true,
    next_billing_date: futurePeriodEnd,
  })).status, 200);
  assert.equal(user.plan, "CREATOR");
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

test("configured Creator product activates Creator access", async () => {
  const f = fixture();
  const response = await f.deliver("subscription.active", "event-15", false, { product_id: "pdt_creator" });
  assert.equal(response.status, 200);
  assert.equal(f.user.plan, "CREATOR");
});

test("cancellation with no date preserves the previously verified paid end", async () => {
  const h = fixture();
  const end = "2099-12-01T10:00:00Z";
  await h.deliver("subscription.active", "active", false, { next_billing_date: end });
  await h.deliver("subscription.cancelled", "cancel", false, { status: "cancelled" });
  assert.equal(h.user.plan, "CREATOR");
  assert.equal(h.user.subscriptionCurrentPeriodEnd.toISOString(), new Date(end).toISOString());
  assert.equal(h.emails[0].action, "CANCELLATION_SCHEDULED");
  await h.deliver("subscription.cancelled", "cancel-duplicate", false, { status: "cancelled" });
  assert.equal(h.emails.length, 1);
});
test("cancellation with no known period retrieves the provider's boundary", async () => {
  const h = fixture();
  await h.deliver();
  assert.equal((await h.deliver("subscription.cancelled", "cancel", false, { status: "cancelled" })).status, 200);
  assert.equal(h.user.plan, "CREATOR");
  assert.equal(h.user.subscriptionCurrentPeriodEnd.getUTCFullYear(), 2099);
});
test("a cancelled subscription update preserves access and an ended period emails expiry", async () => {
  const h = fixture();
  await h.deliver("subscription.active", "active", false, { next_billing_date: "2099-12-01T10:00:00Z" });
  await h.deliver("subscription.updated", "cancel", false, { status: "cancelled" });
  assert.equal(h.user.plan, "CREATOR");
  assert.equal(h.user.subscriptionStatus, "cancelled");
  const expired = fixture();
  await expired.deliver("subscription.active", "active", false, { next_billing_date: "2000-01-01T00:00:00Z" });
  await expired.deliver("subscription.cancelled", "ended", false, { status: "cancelled" });
  assert.equal(expired.user.plan, "FREE");
  assert.equal(expired.emails[0].action, "PLAN_ACCESS_ENDED");
});

test("scheduling cancellation without a stored date verifies the end before retaining paid access", async () => {
  const h = fixture();
  await h.deliver();
  assert.equal((await h.deliver("subscription.updated", "scheduled", false, { cancel_at_next_billing_date: true })).status, 200);
  assert.equal(h.user.plan, "CREATOR");
  assert.equal(h.user.subscriptionCurrentPeriodEnd.getUTCFullYear(), 2099);
  assert.equal(require("./helpers/ai-schema.cjs").effectiveAiPlan(h.user), "CREATOR");
});

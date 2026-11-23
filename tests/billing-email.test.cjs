const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");

function load(file, overrides) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module, exports: module.exports, Date, Buffer, console: { error() {} },
    require(id) { if (id === "server-only") return {}; if (id in overrides) return overrides[id]; throw new Error(id); },
  });
  return module.exports;
}
function fixture(options = {}) {
  const calls = [];
  const end = new Date(Date.now() + 86400000);
  const user = { id: "u", name: "Creator", email: "creator@example.com", customerId: "cus_1", subscriptionId: "sub_1", plan: "CREATOR", subscriptionStatus: "active", subscriptionCancelAtPeriodEnd: true, subscriptionCurrentPeriodEnd: end };
  const job = { id: "receipt", userId: "u", event: { action: "PAYMENT_RECEIPT", paymentId: "pay_1", eventId: "receipt", to: user.email, name: user.name }, paymentId: "pay_1", subscriptionId: "sub_1", paymentEnvironment: "TEST", nextAttemptAt: new Date(0), completedAt: null, lockedUntil: null, attempts: 0, ...options.job };
  const jobs = new Map([[job.id, job]]);
  const db = {
    user: { findUnique: async () => user },
    billingEmail: {
      findMany: async () => [...jobs.values()].filter(j => !j.completedAt && j.nextAttemptAt <= new Date() && (!j.lockedUntil || j.lockedUntil <= new Date())),
      updateMany: async ({ where, data }) => {
        const j = jobs.get(where.id);
        if (!j || j.completedAt || (where.OR && j.lockedUntil && j.lockedUntil > new Date())) return { count: 0 };
        if (where.lockedUntil && j.lockedUntil?.getTime() !== where.lockedUntil.getTime()) return { count: 0 };
        Object.assign(j, data, { attempts: j.attempts + (data.attempts?.increment ?? 0) });
        return { count: 1 };
      },
    },
  };
  const client = {
    payments: { retrieve: async () => ({ status: "succeeded", customer: { customer_id: options.wrongCustomer ? "wrong" : "cus_1" }, subscription_ids: ["sub_1"] }) },
    subscriptions: { retrieve: async () => ({ customer: { customer_id: "cus_1" }, metadata: { userId: "u" }, product_id: "pdt_creator" }) },
    invoices: { payments: { retrieve: async id => {
      assert.equal(id, "pay_1");
      if (options.invoiceFails) throw new Error("unavailable");
      return { ok: true, arrayBuffer: async () => Buffer.from(options.invalidPdf ? "not a pdf" : "%PDF-1.7\nactual-provider-invoice") };
    } } },
  };
  const api = load("lib/payments/billing-email.ts", {
    "@/lib/prisma": { db },
    "@/lib/email/send": { sendEmailAction: async (event, attachments) => { calls.push({ event, attachments }); return options.sendFails ? { status: "failed", reason: "provider_error" } : { status: "sent", id: "email_1" }; } },
    "./dodopayments": { createDodoPayments: () => client },
    "./config": { paymentCredentials: () => ({ apiKey: "test", environment: "test_mode" }), productIdForPlan: plan => plan === "CREATOR" ? "pdt_creator" : "pdt_pro" },
  });
  return { ...api, job, user, calls, options };
}

test("receipts attach actual provider PDF bytes and complete once", async () => {
  const h = fixture();
  const result = await h.deliverBillingEmails();
  assert.equal(result.sent, 1);
  assert.equal(h.calls[0].attachments[0].content.toString(), "%PDF-1.7\nactual-provider-invoice");
  assert.equal(h.calls[0].attachments[0].contentType, "application/pdf");
  assert.ok(h.job.completedAt);
  await h.deliverBillingEmails();
  assert.equal(h.calls.length, 1);
});
for (const options of [{ invoiceFails: true }, { invalidPdf: true }, { wrongCustomer: true }, { sendFails: true }]) {
  test(`billing failure stays retryable ${JSON.stringify(options)}`, async () => {
    const h = fixture(options);
    assert.equal((await h.deliverBillingEmails()).failed, 1);
    assert.equal(h.job.completedAt, null);
    assert.equal(h.job.lockedUntil, null);
    assert.ok(h.job.nextAttemptAt > new Date());
    Object.assign(options, { invoiceFails: false, invalidPdf: false, wrongCustomer: false, sendFails: false });
    h.job.nextAttemptAt = new Date(0);
    assert.equal((await h.deliverBillingEmails()).sent, 1);
  });
}
test("concurrent delivery workers claim a job once", async () => {
  const h = fixture();
  await Promise.all([h.deliverBillingEmails(), h.deliverBillingEmails()]);
  assert.equal(h.calls.length, 1);
});
test("expired, reversed and changed-period reminders are discarded before sending", async () => {
  for (const change of [{ subscriptionCancelAtPeriodEnd: false }, { subscriptionCurrentPeriodEnd: new Date(0) }, { subscriptionId: "new_subscription" }]) {
    const h = fixture();
    h.job.event = { action: "PLAN_EXPIRY_REMINDER", eventId: "expiry", periodEnd: h.user.subscriptionCurrentPeriodEnd.toISOString(), to: h.user.email, name: h.user.name };
    h.job.periodEnd = h.user.subscriptionCurrentPeriodEnd;
    Object.assign(h.user, change);
    await h.deliverBillingEmails();
    assert.equal(h.calls.length, 0);
    assert.ok(h.job.completedAt);
  }
});
test("billing queue migration is additive and enforces unique delivery IDs", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`CREATE TYPE "PaymentEnvironment" AS ENUM ('LIVE', 'TEST');`);
    await pg.exec(fs.readFileSync("prisma/migrations/20261124000000_billing_notifications/migration.sql", "utf8"));
    const insert = `INSERT INTO "BillingEmail" (id, "userId", event, "subscriptionId", "paymentEnvironment") VALUES ('one', 'u', '{}', 'sub', 'TEST')`;
    await pg.exec(insert);
    await assert.rejects(pg.exec(insert));
  } finally { await pg.close(); }
});

function cycleFixture(changes = {}, providerChanges = {}) {
  const now = new Date("2030-11-28T09:00:00Z");
  const user = { id: "u", name: "Creator", email: "creator@example.com", customerId: "cus_1", subscriptionId: "sub_1", paymentEnvironment: "TEST", plan: "CREATOR", subscriptionStatus: "active", subscriptionCancelAtPeriodEnd: false, subscriptionCurrentPeriodEnd: new Date("2030-12-01T10:00:00Z"), ...changes };
  const jobs = new Map();
  const tx = {
    $queryRaw: async () => [],
    user: { findUnique: async () => ({ ...user }), update: async ({ data }) => Object.assign(user, data) },
  };
  const db = {
    user: {
      findMany: async query => { assert.equal(query.take, 100); return [{ ...user }]; },
      updateMany: async ({ data }) => { Object.assign(user, data); return { count: 1 }; },
    },
    $transaction: async callback => callback(tx),
  };
  const api = load("lib/payments/billing-cycle.ts", {
    "@/lib/prisma": { db },
    "./billing-email": { queueBillingEmail: async (_tx, job) => { if (!jobs.has(job.id)) jobs.set(job.id, job); } },
    "./config": { paymentCredentials: () => ({ apiKey: "test", environment: "test_mode" }), productIdForPlan: plan => plan === "CREATOR" ? "pdt_creator" : "pdt_pro" },
    "./dodopayments": { createDodoPayments: () => ({ subscriptions: { retrieve: async () => ({ product_id: "pdt_creator", customer: { customer_id: "cus_1" }, status: "cancelled", next_billing_date: "2030-12-01T10:00:00Z", ...providerChanges }) } }) },
  });
  return { ...api, user, jobs, now };
}
for (const cancelled of [true, false]) {
  test(`three-day reminders have accurate renewal/expiry wording, cancelled=${cancelled}`, async () => {
    const h = cycleFixture({ subscriptionCancelAtPeriodEnd: cancelled });
    await h.processBillingCycles(h.now);
    await h.processBillingCycles(h.now);
    assert.equal(h.jobs.size, 1);
    assert.equal([...h.jobs.values()][0].event.action, cancelled ? "PLAN_EXPIRY_REMINDER" : "PLAN_RENEWAL_REMINDER");
    assert.equal(h.user.plan, "CREATOR");
  });
}
test("cycle job finalizes a cancelled plan at its paid end and queues one expiry notice", async () => {
  const h = cycleFixture({ subscriptionCancelAtPeriodEnd: true });
  await h.processBillingCycles(new Date("2030-12-01T10:00:00Z"));
  assert.equal(h.user.plan, "FREE");
  assert.equal([...h.jobs.values()][0].event.action, "PLAN_ACCESS_ENDED");
  await h.processBillingCycles(new Date("2030-12-01T10:00:01Z"));
  assert.equal(h.jobs.size, 1);
});
test("legacy cancelled accounts recover remaining paid time only after provider verification", async () => {
  const h = cycleFixture({ plan: "FREE", subscriptionStatus: "cancelled" });
  await h.processBillingCycles(h.now);
  assert.equal(h.user.plan, "CREATOR");
  const mismatch = cycleFixture({ plan: "FREE", subscriptionStatus: "cancelled" }, { customer: { customer_id: "other" } });
  await mismatch.processBillingCycles(mismatch.now);
  assert.equal(mismatch.user.plan, "FREE");
});

test("legacy restoration does not send a three-day reminder too early", async () => {
  const h = cycleFixture({ plan: "FREE", subscriptionStatus: "cancelled" });
  await h.processBillingCycles(new Date("2030-11-01T00:00:00Z"));
  assert.equal(h.user.plan, "CREATOR");
  assert.equal(h.jobs.size, 0);
});

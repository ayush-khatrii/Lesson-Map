const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function fixture(options = {}) {
  const writes = [];
  const reads = [];
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../app/api/subscription/confirm/route.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports,
    require(id) {
      if (id === "@/lib/auth") return { auth: { api: { getSession: async () => options.signedOut ? null : { user: { id: "user-1" } } } } };
      if (id === "next/headers") return { headers: async () => new Headers() };
      if (id === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (id === "@/lib/payments/config") return { PaymentConfigurationError: class extends Error {}, checkoutConfiguration: () => ({ apiKey: "test", environment: "test_mode", productId: "pdt_creator" }) };
      if (id === "@/lib/payments/dodopayments") return { createDodoPayments: () => ({ subscriptions: { retrieve: async (id, config) => {
        reads.push({ id, config });
        if (options.providerError) throw new Error("Provider unavailable");
        return {
          metadata: { userId: "user-1" }, product_id: "pdt_creator", status: "active",
          customer: { customer_id: "customer-1" }, next_billing_date: "2026-11-01T00:00:00Z",
          cancel_at_next_billing_date: false, ...options.subscription,
        };
      } } }) };
      if (id === "@/lib/prisma") return { db: { user: { updateMany: async (write) => {
        writes.push(write); return { count: options.conflict ? 0 : 1 };
      } } } };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return { writes, reads, post: (body = { subscriptionId: "sub_example", plan: "CREATOR" }) => module.exports.POST({ json: async () => body }) };
}

test("verified active subscription repairs missing webhook activation", async () => {
  const h = fixture();
  const response = await h.post();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).subscriptionStatus, "active");
  assert.equal(h.writes[0].where.id, "user-1");
  assert.equal(h.writes[0].data.plan, "CREATOR");
  assert.equal(h.writes[0].data.subscriptionId, "sub_example");
  assert.equal(h.writes[0].where.OR[1].subscriptionId, "sub_example");
  assert.equal(h.reads[0].config.timeout, 10000);
});

for (const subscription of [{ metadata: { userId: "other-user" } }, { metadata: {} }, { product_id: "other-product" }]) {
  test(`rejects mismatched ownership or product: ${JSON.stringify(subscription)}`, async () => {
    const h = fixture({ subscription });
    assert.equal((await h.post()).status, 403);
    assert.equal(h.writes.length, 0);
  });
}

test("browser status cannot activate a provider-pending subscription", async () => {
  const h = fixture({ subscription: { status: "pending" } });
  const response = await h.post({ subscriptionId: "sub_example", plan: "CREATOR", status: "active" });
  assert.equal((await response.json()).subscriptionStatus, "pending");
  assert.equal(h.writes.length, 0);
});

test("requires authentication and a valid checkout reference before contacting Dodo", async () => {
  const h = fixture({ signedOut: true });
  assert.equal((await h.post()).status, 401);
  assert.equal(h.reads.length, 0);
  const valid = fixture();
  assert.equal((await valid.post(null)).status, 400);
  assert.equal(valid.reads.length, 0);
});

test("provider errors and an existing different subscription return recoverable errors", async () => {
  assert.equal((await fixture({ providerError: true }).post()).status, 502);
  assert.equal((await fixture({ conflict: true }).post()).status, 409);
});

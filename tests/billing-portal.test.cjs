const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function fixture(options = {}) {
  const calls = [];
  const lookups = [];
  const env = {
    DODO_PAYMENTS_API_KEY: "server-secret",
    DODO_PAYMENTS_ENVIRONMENT: "test_mode",
    NEXT_PUBLIC_BASE_URL: "https://example.com",
  };
  const module = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../app/api/billing/portal/route.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    process: { env },
    URL,
    console: { error() {} },
    require(id) {
      if (id === "@/lib/auth") return { auth: { api: { getSession: async () =>
        options.signedOut ? null : { session: { userId: "user-1" } } } } };
      if (id === "@/lib/prisma") return { db: { user: { findUnique: async (query) => {
        lookups.push(query);
        return options.missingUser ? null : {
          customerId: options.customerId === undefined ? "customer-for-user-1" : options.customerId,
        };
      } } } };
      if (id === "@/lib/payments/dodopayments") return { createDodoPayments: (apiKey, environment) => {
        calls.push({ apiKey, environment });
        return { customers: { customerPortal: { create: async (...args) => {
          calls.push(args);
          return { link: options.link ?? "https://customer.dodopayments.com/session/secure" };
        } } } };
      } };
      if (id === "@/lib/payments/config") return {
        PaymentConfigurationError: class extends Error {},
        billingPortalConfiguration: () => ({
          apiKey: env.DODO_PAYMENTS_API_KEY,
          environment: env.DODO_PAYMENTS_ENVIRONMENT,
          returnUrl: "https://example.com/settings",
        }),
      };
      if (id === "@/lib/payments/request-security") return { isSameOriginRequest: () => options.sameOrigin !== false };
      if (id === "next/headers") return { headers: async () => new Headers() };
      if (id === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return {
    calls,
    lookups,
    post: () => module.exports.POST({}),
  };
}

test("billing portal session uses only the authenticated user's stored customer", async () => {
  const h = fixture();
  const response = await h.post();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).url, "https://customer.dodopayments.com/session/secure");
  assert.equal(h.lookups[0].where.id, "user-1");
  assert.equal(h.calls[1][0], "customer-for-user-1");
  assert.equal(JSON.stringify(h.calls[1][1]), JSON.stringify({ return_url: "https://example.com/settings" }));
  assert.equal(h.calls[1][2].maxRetries, 0);
});

test("billing portal rejects unauthenticated, cross-origin, and unlinked accounts", async () => {
  for (const [options, status] of [
    [{ signedOut: true }, 401],
    [{ sameOrigin: false }, 403],
    [{ customerId: null }, 409],
  ]) {
    const h = fixture(options);
    assert.equal((await h.post()).status, status);
    assert.equal(h.calls.length, 0);
  }
});

test("billing portal refuses a non-Dodo redirect URL", async () => {
  const response = await fixture({ link: "https://attacker.example/session" }).post();
  assert.equal(response.status, 502);
});

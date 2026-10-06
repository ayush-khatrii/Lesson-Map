const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function harness(overrides = {}, options = {}) {
  const env = {
    NODE_ENV: "production", DODO_PAYMENTS_API_KEY: "test-secret",
    DODO_PAYMENTS_ENVIRONMENT: "test_mode", DODO_PRODUCT_CREATOR: "pdt_creator",
    DODO_PRODUCT_PROFESSIONAL: "pdt_professional", NEXT_PUBLIC_BASE_URL: "https://example.com/",
    DODO_PAYMENTS_WEBHOOK_SECRET: "test-webhook-secret",
    ...overrides,
  };
  const calls = [];
  const logs = [];
  const cache = {};
  function load(file) {
    if (cache[file]) return cache[file];
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
      module, exports: module.exports, process: { env }, URL,
      console: { error: (...args) => logs.push(args) },
      require(id) {
        if (id === "@/lib/payments/config") return load("lib/payments/config.ts");
        if (id === "@/lib/payments/dodopayments") return load("lib/payments/dodopayments.ts");
        if (id === "@/lib/payments/request-security") return { isSameOriginRequest: () => true };
        if (id === "@/lib/ai/schema") return { effectiveAiPlan: (user) =>
          user.plan !== "FREE" && (user.subscriptionStatus === "active" ||
            (user.subscriptionStatus === "cancelled" && user.subscriptionCancelAtPeriodEnd &&
              user.subscriptionCurrentPeriodEnd > new Date())) ? user.plan : "FREE" };
        if (id === "dodopayments") return { DodoPayments: class {
          constructor(config) { calls.push({ config }); }
          checkoutSessions = { create: async (request) => {
            calls.push({ request });
            return { checkout_url: options.noUrl ? null : "https://checkout.example/session/test" };
          } };
        } };
        if (id === "@/lib/auth") return { auth: { api: { getSession: async () => options.unauthenticated ? null : {
          session: { userId: "user-1" }, user: { name: "Test", email: "test@example.com" },
        } } } };
        if (id === "@/lib/prisma") return { db: { user: { findUnique: async () => options.active ?
          { plan: "CREATOR", subscriptionStatus: "active" } : { plan: "FREE" } } } };
        if (id === "next/headers") return { headers: async () => new Headers() };
        if (id === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
        throw new Error(`Unexpected import ${id}`);
      },
    });
    return cache[file] = module.exports;
  }
  return { calls, logs, post: (plan = "CREATOR") => load("app/api/checkout/route.ts").POST({
    headers: new Headers({ origin: "https://example.com" }),
    json: async () => ({ plan }),
  }) };
}

for (const plan of ["CREATOR", "PROFESSIONAL"]) {
  test(`${plan} checkout sends the correct product, identity and return URL`, async () => {
    const h = harness({ DODO_PAYMENTS_API_KEY: " test-secret ", DODO_PAYMENTS_ENVIRONMENT: "live_mode" });
    const response = await h.post(plan);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).checkoutUrl, "https://checkout.example/session/test");
    assert.equal(h.calls[0].config.bearerToken, "test-secret");
    assert.equal(h.calls[0].config.environment, "live_mode");
    const request = h.calls[1].request;
    assert.equal(request.product_cart[0].product_id, `pdt_${plan.toLowerCase()}`);
    assert.equal(request.metadata.userId, "user-1");
    assert.equal(request.metadata.plan, plan);
    assert.equal(request.return_url, `https://example.com/checkout/return?plan=${plan}`);
  });
}

for (const [overrides, expected] of [
  [{ DODO_PAYMENTS_API_KEY: "", DODO_PAYMENTS_KEY: "legacy-secret" }, "DODO_PAYMENTS_API_KEY"],
  [{ DODO_PRODUCT_CREATOR: " " }, "DODO_PRODUCT_CREATOR"],
  [{ DODO_PAYMENTS_WEBHOOK_SECRET: "" }, "DODO_PAYMENTS_WEBHOOK_SECRET"],
  [{ DODO_PAYMENTS_ENVIRONMENT: "" }, "DODO_PAYMENTS_ENVIRONMENT"],
  [{ DODO_PAYMENTS_ENVIRONMENT: "live" }, "DODO_PAYMENTS_ENVIRONMENT"],
  [{ NEXT_PUBLIC_BASE_URL: "" }, "NEXT_PUBLIC_BASE_URL"],
  [{ NEXT_PUBLIC_BASE_URL: "invalid" }, "NEXT_PUBLIC_BASE_URL"],
]) {
  test(`invalid configuration logs ${expected} and never contacts Dodo`, async () => {
    const h = harness(overrides);
    const response = await h.post();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "CHECKOUT_NOT_CONFIGURED");
    assert.equal(h.calls.length, 0);
    assert.match(JSON.stringify(h.logs), new RegExp(expected));
    assert.doesNotMatch(JSON.stringify(h.logs), /test-secret|legacy-secret/);
  });
}

test("Creator checkout does not require a Professional product", async () => {
  assert.equal((await harness({ DODO_PRODUCT_PROFESSIONAL: "" }).post()).status, 200);
});

test("authentication, valid plan and existing subscription checks prevent checkout", async () => {
  for (const [options, plan, status] of [[{ unauthenticated: true }, "CREATOR", 401], [{}, "FREE", 400], [{ active: true }, "CREATOR", 409]]) {
    const h = harness({}, options);
    assert.equal((await h.post(plan)).status, status);
    assert.equal(h.calls.length, 0);
  }
});

test("missing hosted URL is a failure instead of a successful redirect", async () => {
  assert.equal((await harness({}, { noUrl: true }).post()).status, 500);
});

test("setup diagnostics are available locally, but hidden in production", async () => {
  const local = await harness({ NODE_ENV: "development", DODO_PRODUCT_CREATOR: "" }).post();
  assert.match((await local.json()).detail, /DODO_PRODUCT_CREATOR/);
  const production = await harness({ DODO_PRODUCT_CREATOR: "" }).post();
  assert.equal((await production.json()).detail, undefined);
});

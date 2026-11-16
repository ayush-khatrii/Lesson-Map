const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");

function load(file, overrides = {}, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      URL,
      Headers,
      Response,
      process: { env: { NEXT_PUBLIC_BASE_URL: "https://lessonmap.org" } },
      require(id) {
        if (id in overrides) return overrides[id];
        throw new Error(id);
      },
      ...globals,
    },
  );
  return module.exports;
}
class NextResponse extends Response {
  static next(options) {
    return { type: "next", options };
  }
  static rewrite(url, options) {
    return { type: "rewrite", url, options };
  }
  static redirect(url) {
    return { type: "redirect", url };
  }
}
function proxy() {
  return load("proxy.ts", {
    "next/server": { NextResponse },
    "better-auth/cookies": { getSessionCookie: () => null },
  }).default;
}
function request(url, headers = {}) {
  const parsed = new URL(url);
  parsed.clone = () => new URL(url);
  return { nextUrl: parsed, url, headers: new Headers(headers) };
}
test("creator subdomain root rewrites to that creator's listing", async () => {
  const result = await proxy()(request("https://alice.lessonmap.org/"));
  assert.equal(result.type, "rewrite");
  assert.equal(result.url.pathname, "/creators/alice");
  assert.equal(
    result.options.request.headers.get("x-lessonmap-subdomain"),
    "alice",
  );
});
test("tenant course pages receive a trusted host-derived name; spoofed main-domain headers are removed", async () => {
  const route = proxy();
  const tenant = await route(
    request("https://alice.lessonmap.org/p/course", {
      "x-lessonmap-subdomain": "bob",
    }),
  );
  assert.equal(
    tenant.options.request.headers.get("x-lessonmap-subdomain"),
    "alice",
  );
  const main = await route(
    request("https://lessonmap.org/p/course", {
      "x-lessonmap-subdomain": "bob",
    }),
  );
  assert.equal(main.options.request.headers.get("x-lessonmap-subdomain"), null);
});
test("login, dashboard and progress writes stay on the main domain", async () => {
  for (const path of [
    "/sign-in?callbackUrl=%2Fp%2Fcourse",
    "/dashboard",
    "/api/progress/course",
    "/api/resource/file/open",
  ]) {
    const result = await proxy()(request(`https://alice.lessonmap.org${path}`));
    assert.equal(result.type, "redirect");
    assert.equal(result.url.origin, "https://lessonmap.org");
    assert.equal(`${result.url.pathname}${result.url.search}`, path);
  }
});
test("public capture and analytics stay accessible on the creator's domain", async () => {
  for (const path of [
    "/api/public/course/events",
    "/api/public/course/leads",
  ]) {
    assert.equal(
      (await proxy()(request(`https://alice.lessonmap.org${path}`))).type,
      "next",
    );
  }
});
test("reserved, invalid and nested subdomains are rejected", async () => {
  const { validSubdomain } = load("lib/subdomain.ts");
  for (const name of [
    "www",
    "admin",
    "app",
    "a",
    "ab",
    "-alice",
    "alice-",
    "ALICE",
    "a.b",
    "a".repeat(31),
  ])
    assert.equal(validSubdomain(name), false, name);
  for (const name of ["alice", "alice-123", "a".repeat(30)])
    assert.equal(validSubdomain(name), true, name);
  assert.equal(
    (await proxy()(request("https://one.two.lessonmap.org/"))).status,
    404,
  );
});

test("subdomain settings enforce paid access and report name collisions", async () => {
  const free = { plan: "FREE", subscriptionStatus: null };
  const paid = {
    plan: "CREATOR",
    subscriptionStatus: "active",
    subscriptionCancelAtPeriodEnd: false,
    subscriptionCurrentPeriodEnd: null,
  };
  let user = free;
  let writes = 0;
  const route = load("app/api/settings/subdomain/route.ts", {
    "next/server": { NextResponse: { json: Response.json.bind(Response) } },
    "@/lib/prisma": {
      db: {
        user: {
          findUnique: async () => user,
          update: async () => {
            writes++;
            throw { code: "P2002" };
          },
        },
      },
    },
    "@/lib/launch-access": {
      sessionUserId: async () => "user-1",
      launchError: () => Response.json({}, { status: 500 }),
    },
    "@/lib/ai/schema": require("./helpers/ai-schema.cjs"),
    "@/lib/subdomain": load("lib/subdomain.ts"),
    "@/lib/payments/request-security": { isSameOriginRequest: () => true },
  });
  assert.equal(
    (await route.POST({ json: async () => ({ subdomain: "alice" }) })).status,
    403,
  );
  assert.equal(writes, 0);
  user = paid;
  assert.equal(
    (await route.POST({ json: async () => ({ subdomain: "www" }) })).status,
    400,
  );
  assert.equal(
    (await route.POST({ json: async () => ({ subdomain: "alice" }) })).status,
    409,
  );
});

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
test("public course previews and activity endpoints remain accessible without authentication", async () => {
  for (const path of ["/p/course", "/api/public/course/events", "/api/public/course/leads", "/pricing"])
    assert.equal((await proxy()(request(`https://lessonmap.org${path}`))).type, "next");
});
test("protected pages still redirect guests to sign in with a callback", async () => {
  for (const path of ["/dashboard", "/outline/course", "/settings"]) {
    const result = await proxy()(request(`https://lessonmap.org${path}`));
    assert.equal(result.type, "redirect");
    assert.equal(result.url.pathname, "/sign-in");
    assert.equal(result.url.searchParams.get("callbackUrl"), path);
  }
});
test("protected course APIs reject guests while public authentication stays accessible", async () => {
  assert.equal((await proxy()(request("https://lessonmap.org/api/course"))).status, 401);
  assert.equal((await proxy()(request("https://lessonmap.org/api/auth/get-session"))).type, "next");
});

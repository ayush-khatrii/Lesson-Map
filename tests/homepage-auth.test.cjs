const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(file, overrides, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require(id) {
        if (id in overrides) return overrides[id];
        if (id === "react" || id === "react/jsx-runtime") return require(id);
        throw new Error(`Unexpected import: ${id}`);
      },
      ...globals,
    },
  );
  return module.exports;
}

function navbarFixture({
  session = null,
  pending = false,
  mounted = false,
  allowSession = false,
} = {}) {
  let sessionReads = 0;
  let signOutCalls = 0;
  const links = [];
  const menuItems = [];
  const redirects = [];
  const Container = ({ children }) =>
    React.createElement("div", null, children);
  const ui = new Proxy({}, { get: () => Container });
  const Navbar = load(
    "components/Nav/Navbar.tsx",
    {
      react: mounted ? { ...React, useState: () => [true, () => {}] } : React,
      "next/link": {
        default: ({ children, ...props }) => {
          links.push(props);
          return React.createElement(
            "a",
            { href: props.href, className: props.className },
            children,
          );
        },
        __esModule: true,
      },
      "next/navigation": { usePathname: () => "/" },
      "@/components/Brand": { default: Container, __esModule: true },
      "@/components/ThemeToggle": { default: Container, __esModule: true },
      "@/components/ui/button": ui,
      "@/components/ui/avatar": ui,
      "@/components/ui/sheet": ui,
      "@/components/ui/dropdown-menu": new Proxy(
        {},
        {
          get: (_, name) =>
            name === "DropdownMenuItem"
              ? (props) => {
                  menuItems.push(props);
                  return React.createElement(Container, props);
                }
              : Container,
        },
      ),
      "lucide-react": new Proxy({}, { get: () => () => null }),
      "motion/react": {
        motion: { div: Container },
        useReducedMotion: () => true,
      },
      "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
      sonner: { toast: { error: () => {} } },
      "@/lib/auth-client": {
        useSession: () => {
          sessionReads++;
          assert.ok(
            allowSession,
            "public navigation must not subscribe to authentication",
          );
          return { data: session, isPending: pending };
        },
        signOut: async () => {
          signOutCalls++;
          return {};
        },
      },
    },
    { window: { location: { assign: (url) => redirects.push(url) } } },
  ).default;
  return {
    render: (props) => renderToStaticMarkup(React.createElement(Navbar, props)),
    renderPublicLayout: () => {
      const Layout = load("app/(root)/layout.tsx", {
        "@/app/globals.css": {},
        "@/components/Nav/Navbar": { default: Navbar, __esModule: true },
        "@/components/landing/Footer": { default: Container, __esModule: true },
      }).default;
      return renderToStaticMarkup(
        React.createElement(Layout, null, "Page content"),
      );
    },
    links,
    menuItems,
    redirects,
    sessionReads: () => sessionReads,
    signOutCalls: () => signOutCalls,
  };
}

const session = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    image: null,
  },
};

test("marketing layout selects public navigation without subscribing to authentication", () => {
  const f = navbarFixture();
  const html = f.renderPublicLayout();
  assert.equal(f.sessionReads(), 0);
  assert.match(html, /Start now/);
  assert.match(html, /Page content/);
});

for (const currentSession of [null, session]) {
  test(`public navbar immediately shows Start now without session reads (${currentSession ? "signed in" : "guest"})`, () => {
    const f = navbarFixture({ session: currentSession });
    const html = f.render({ mode: "public" });
    assert.equal(f.sessionReads(), 0);
    assert.match(html, /Start now/);
    assert.doesNotMatch(html, /Loading account|Open profile menu|Dashboard/);
    const start = f.links.filter((link) => link.href === "/start");
    assert.equal(start.length, 1);
    assert.equal(start[0].prefetch, false);
    assert.equal(
      start[0].className,
      undefined,
      "Start now text must not be hidden on mobile",
    );
    for (const href of ["/", "/about", "/examples", "/pricing"]) {
      assert.equal(
        f.links.filter((link) => link.href === href).length,
        2,
        "desktop and mobile links are preserved",
      );
    }
  });
}

test("default account navbar preserves profile links and sign-out", async () => {
  const f = navbarFixture({ session, mounted: true, allowSession: true });
  const html = f.render({});
  assert.equal(f.sessionReads(), 1);
  assert.match(html, /test@example.com/);
  for (const href of [
    "/dashboard",
    "/settings?tab=profile",
    "/settings?tab=settings",
  ]) {
    assert.ok(f.links.some((link) => link.href === href));
  }
  assert.ok(!f.links.some((link) => link.href === "/start"));
  const signOut = f.menuItems.find((item) => item.onClick);
  await signOut.onClick();
  assert.equal(f.signOutCalls(), 1);
  assert.deepEqual(f.redirects, ["/sign-in"]);
});

test("account navbar still handles pending sessions and signed-out users", () => {
  const pending = navbarFixture({ pending: true, allowSession: true });
  assert.match(pending.render({}), /Loading account/);
  const guest = navbarFixture({ mounted: true, allowSession: true });
  assert.match(guest.render({}), /Start now/);
  assert.equal(
    guest.links.find((link) => link.href === "/start").prefetch,
    false,
  );
});

test("Start validates real sessions and redirects valid, missing, invalid, and expired sessions", async () => {
  const { betterAuth } = await import("better-auth");
  const { memoryAdapter } = await import("better-auth/adapters/memory");
  const database = { user: [], account: [], session: [], verification: [] };
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "homepage-test-secret-with-at-least-32-characters",
    database: memoryAdapter(database),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
  });
  const signup = await auth.handler(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        password: "a long test password 123!",
      }),
    }),
  );
  assert.equal(signup.status, 200);
  const cookie = signup.headers.get("set-cookie").split(";")[0];
  let requestHeaders = new Headers();
  let checks = 0;
  const StartPage = load("app/(root)/start/page.tsx", {
    "@/lib/auth": {
      auth: {
        api: {
          getSession: async (options) => {
            checks++;
            assert.equal(options.headers, requestHeaders);
            return auth.api.getSession(options);
          },
        },
      },
    },
    "next/headers": { headers: async () => requestHeaders },
    "next/navigation": {
      redirect: (url) => {
        throw new Error(url);
      },
    },
  }).default;
  assert.equal(
    checks,
    0,
    "loading the route module must not check authentication",
  );
  for (const [name, value, destination] of [
    ["valid", cookie, "/dashboard"],
    ["missing", "", "/sign-in?callbackUrl=%2Fdashboard"],
    [
      "invalid",
      "better-auth.session_token=invalid",
      "/sign-in?callbackUrl=%2Fdashboard",
    ],
    ["expired", cookie, "/sign-in?callbackUrl=%2Fdashboard"],
  ]) {
    if (name === "expired") database.session[0].expiresAt = new Date(0);
    requestHeaders = new Headers(value ? { cookie: value } : {});
    await assert.rejects(
      StartPage(),
      (error) => error.message === destination,
      name,
    );
  }
  assert.equal(checks, 4);
});

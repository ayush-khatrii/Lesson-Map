const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const source = ts.transpileModule(
  fs.readFileSync("app/(root)/pricing/page.tsx", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function fixture({
  plan = null,
  signedIn = false,
  pending = false,
  planPending = false,
  error = false,
  fetchResponse,
} = {}) {
  const buttons = [];
  const requests = [];
  const redirects = [];
  const notices = [];
  let refreshes = 0;
  const module = { exports: {} };
  const Container = ({ children }) =>
    React.createElement("div", null, children);
  const Button = (props) => {
    buttons.push(props);
    return React.createElement(
      "button",
      { disabled: props.disabled },
      props.children,
    );
  };
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    process: { env: { NODE_ENV: "test" } },
    fetch: async (...args) => {
      requests.push(args);
      return (
        fetchResponse ?? {
          ok: true,
          status: 200,
          json: async () => ({
            url: "https://customer.dodopayments.com/session",
          }),
        }
      );
    },
    window: { location: { assign: (url) => redirects.push(url) } },
    require(id) {
      if (id === "react" || id === "react/jsx-runtime") return require(id);
      if (id === "@/lib/auth-client")
        return {
          useSession: () => ({
            data: signedIn ? { user: { id: "user-1" } } : null,
            isPending: pending,
          }),
        };
      if (id === "@/lib/flow/useSubscriptionPlan")
        return {
          useSubscriptionPlan: () => ({
            plan,
            isLoading: planPending,
            isError: error,
            isFetching: false,
            refetch: async () => {
              refreshes++;
            },
          }),
        };
      if (id === "next/navigation")
        return { useRouter: () => ({ push: (url) => redirects.push(url) }) };
      if (id === "sonner")
        return {
          toast: {
            error: (message) => notices.push(message),
            info: (message) => notices.push(message),
          },
        };
      if (id === "@/lib/utils") return { cn: () => "" };
      if (id === "@/constants")
        return {
          comparisonRows: [],
          plans: ["FREE", "CREATOR"].map((type) => ({
            type,
            name: type,
            features: [],
            cta: type === "FREE" ? "Start Free" : "Start Creator Plan",
          })),
        };
      if (id === "@/components/ui/button") return { Button };
      if (
        id.startsWith("@/components/ui/") ||
        id === "lucide-react" ||
        id === "react-icons/fa"
      )
        return new Proxy({}, { get: () => Container });
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  const html = renderToStaticMarkup(
    React.createElement(module.exports.default),
  );
  return {
    html,
    buttons,
    requests,
    redirects,
    notices,
    refreshes: () => refreshes,
  };
}

test("guests can choose either plan", () => {
  const f = fixture();
  assert.match(f.html, /Start Free/);
  assert.match(f.html, /Start Creator Plan/);
  assert.ok(f.buttons.every((button) => !button.disabled));
});
test("session loading disables plan actions without claiming a current plan", () => {
  const f = fixture({ pending: true });
  assert.match(f.html, /Checking your plan/);
  assert.ok(f.buttons.every((button) => button.disabled));
});
test("signed-in Free account has current badge and can upgrade", () => {
  const f = fixture({ signedIn: true, plan: "FREE" });
  assert.match(f.html, /Current plan/);
  assert.equal(f.buttons[0].disabled, true);
  assert.equal(f.buttons[1].disabled, false);
});
test("paid subscriber sees billing action and opens authenticated portal", async () => {
  const f = fixture({ signedIn: true, plan: "CREATOR" });
  assert.match(f.html, /Current plan/);
  assert.match(f.html, /Manage billing/);
  assert.equal(f.buttons[1].disabled, false);
  await f.buttons[1].onClick();
  assert.equal(f.requests[0][0], "/api/billing/portal");
  assert.equal(f.requests[0][1].method, "POST");
  assert.equal(f.redirects[0], "https://customer.dodopayments.com/session");
});
test("Professional subscribers can manage billing without buying Creator", () => {
  const f = fixture({ signedIn: true, plan: "PROFESSIONAL" });
  assert.match(f.html, /active paid subscription/);
  assert.doesNotMatch(f.html, /Professional|Custom/);
  assert.match(f.html, /Manage billing/);
  assert.doesNotMatch(f.html, /Start Creator Plan/);
});
test("status failure blocks purchases and offers a retry", async () => {
  const f = fixture({ signedIn: true, error: true });
  assert.match(f.html, /Plan unavailable/);
  assert.ok(f.buttons.slice(1).every((button) => button.disabled));
  await f.buttons[0].onClick();
  assert.equal(f.refreshes(), 1);
});
test("expired billing session redirects to sign in", async () => {
  const f = fixture({
    signedIn: true,
    plan: "CREATOR",
    fetchResponse: { status: 401 },
  });
  await f.buttons[1].onClick();
  assert.equal(f.redirects[0], "/sign-in?callbackUrl=%2Fpricing");
});
test("portal failure shows a retryable error and does not navigate", async () => {
  const f = fixture({
    signedIn: true,
    plan: "CREATOR",
    fetchResponse: { ok: false, status: 503, json: async () => ({}) },
  });
  await f.buttons[1].onClick();
  assert.equal(f.notices.length, 1);
  assert.equal(f.redirects.length, 0);
});
test("concurrent billing clicks create only one portal request", async () => {
  const f = fixture({ signedIn: true, plan: "CREATOR" });
  await Promise.all([f.buttons[1].onClick(), f.buttons[1].onClick()]);
  assert.equal(f.requests.length, 1);
});

test("subscription loading blocks actions for signed-in users", () => {
  const f = fixture({ signedIn: true, planPending: true });
  assert.match(f.html, /Checking your plan/);
  assert.ok(f.buttons.every((button) => button.disabled));
});
test("checkout recheck prevents a second subscription after an upgrade in another tab", async () => {
  const f = fixture({
    signedIn: true,
    plan: "FREE",
    fetchResponse: {
      ok: true,
      status: 200,
      json: async () => ({ plan: "CREATOR" }),
    },
  });
  await f.buttons[1].onClick();
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0][0], "/api/subscription/status");
  assert.equal(f.refreshes(), 1);
  assert.equal(f.redirects.length, 0);
});

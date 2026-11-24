const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const { PassThrough } = require("node:stream");
const ts = require("typescript");
const React = require("react");
const { renderToPipeableStream, renderToStaticMarkup } = require("react-dom/server");

function load(file, overrides = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    URLSearchParams,
    ...globals,
    require(id) {
      if (id in overrides) return overrides[id];
      if (id.startsWith("@/components/ui/"))
        return new Proxy({}, { get: () => ({ children }) => children });
      if (id === "lucide-react")
        return new Proxy({}, { get: () => () => null });
      return require(id);
    },
  });
  return module.exports;
}

test("admin filters update the report URL immediately without a server navigation", () => {
  let url = new URL("https://lessonmap.org/dashboard/admin/users?page=3&q=old");
  const replacements = [];
  const window = {
    get location() { return url; },
    history: {
      replaceState(_state, _title, next) {
        replacements.push(next);
        url = new URL(next, url);
      },
    },
  };
  const { useAdminParams } = load("components/admin/Shared.tsx", {
    "next/navigation": {
      usePathname: () => url.pathname,
      useSearchParams: () => new URLSearchParams(url.search),
      useRouter: () => assert.fail("Filters must not wait for a server navigation"),
    },
    "@/lib/admin/report-options": {},
    "@/lib/admin/client": {},
    "@/lib/admin/financial": {},
    "@/lib/admin/filters": {},
  }, { window });
  const controls = useAdminParams();
  controls.set({ q: "teacher", paid: "true" });
  assert.equal(url.searchParams.get("q"), "teacher");
  assert.equal(url.searchParams.get("paid"), "true");
  assert.equal(url.searchParams.has("page"), false);
  // A second update in the same event must retain the first update's filters.
  controls.set({ page: "2" }, false);
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("q"), "teacher");
  assert.equal(useAdminParams().params.get("paid"), "true");
  controls.reset();
  assert.equal(url.pathname, "/dashboard/admin/users");
  assert.equal(url.search, "");
  assert.equal(replacements.length, 3);
});

test("admin sidebar links prefetch routes and report data before navigation", () => {
  const links = [];
  const routes = [];
  const reports = [];
  const queryClient = { clear() {}, prefetchQuery: async (options) => reports.push(options) };
  const Container = ({ children }) => React.createElement("div", null, children);
  const { AdminShell } = load("components/admin/AdminShell.tsx", {
    "next/link": {
      __esModule: true,
      default: (props) => {
        links.push(props);
        return React.createElement("a", { href: props.href }, props.children);
      },
    },
    "next/navigation": {
      usePathname: () => "/dashboard/admin",
      useRouter: () => ({ prefetch: (href) => routes.push(href) }),
    },
    "@tanstack/react-query": {
      QueryClient: class { constructor() { return queryClient; } },
      QueryClientProvider: Container,
      useQueryClient: () => queryClient,
    },
    "@/lib/admin/report-options": { adminReportOptions: (resource) => ({ resource }) },
    "@/lib/admin/client": {},
    "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
    "@/components/ThemeToggle": { __esModule: true, default: () => null },
  });
  renderToStaticMarkup(React.createElement(AdminShell, {
    user: { id: "admin", name: "Admin", email: "admin@example.com", role: "ADMIN" },
    children: "Report",
  }));
  const navigation = links.filter(link => link.href.startsWith("/dashboard/admin"));
  for (const link of navigation) {
    assert.equal(link.prefetch, true, link.href);
  }
  const destinations = new Map(navigation.map(link => [link.href, link]));
  assert.equal(destinations.size, 5);
  for (const link of destinations.values()) {
    link.onPointerEnter();
  }
  assert.equal(routes.length, 5);
  assert.deepEqual(reports.map(options => options.resource), ["overview", "users", "content", "revenue", "access"]);
});

test("admin loading UI streams inside the shell while page authorization is pending", { timeout: 10000 }, async (t) => {
  const Loading = load("app/(dashboard)/dashboard/admin/(protected)/loading.tsx").default;
  let authorize;
  const pending = new Promise(resolve => { authorize = resolve; });
  const { default: UsersPage } = load("app/(dashboard)/dashboard/admin/(protected)/users/page.tsx", {
    "@/lib/admin/guard": { requireAdminPage: () => pending },
    "@/components/admin/UsersView": { UsersView: () => React.createElement("div", null, "Authorized users report") },
  });
  const Page = React.lazy(async () => {
    const content = await UsersPage();
    return { default: () => content };
  });
  const output = new PassThrough();
  let html = "";
  output.on("data", chunk => { html += chunk.toString(); });
  const firstChunk = new Promise(resolve => output.once("data", resolve));
  const finished = new Promise((resolve, reject) => {
    output.on("end", resolve);
    output.on("error", reject);
  });
  const stream = renderToPipeableStream(React.createElement("main", null,
    React.createElement("nav", null, "Admin navigation"),
    React.createElement(React.Suspense, { fallback: React.createElement(Loading) }, React.createElement(Page)),
  ), {
    onShellReady() { stream.pipe(output); },
    onShellError(error) { output.destroy(error); },
  });
  t.after(() => stream.abort());
  await firstChunk;
  assert.match(html, /Admin navigation/);
  assert.match(html, /Loading admin page/);
  assert.doesNotMatch(html, /Authorized users report/);
  authorize();
  await finished;
  assert.match(html, /Authorized users report/);
});

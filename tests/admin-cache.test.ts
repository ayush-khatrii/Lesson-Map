import assert from "node:assert/strict";
import { test } from "node:test";
import {
  QueryClient,
  QueryObserver,
  keepPreviousData,
  isCancelledError,
} from "@tanstack/react-query";
import { adminReportOptions } from "../lib/admin/report-options";
import { adminReportParams } from "../lib/admin/report-query";

test("report keys share reordered/default filters and ignore unrelated screen parameters", () => {
  assert.equal(
    adminReportParams(
      "users",
      "q=%20Owner%20&page=1&pageSize=25&sort=accountAgeDays&direction=desc&currency=USD&refresh=true",
    ),
    "q=Owner",
  );
  assert.equal(
    adminReportParams("users", "paid=true&q=Owner"),
    adminReportParams("users", "q=Owner&paid=true"),
  );
  assert.equal(adminReportParams("access", "page=4&q=anything"), "");
  assert.equal(
    adminReportParams("overview", "period=30d&currency=INR&page=7"),
    "",
  );
  assert.equal(adminReportParams("overview", "period=all"), "period=all");
  assert.notEqual(
    adminReportParams("users", "paid=true"),
    adminReportParams("users", "paid=false"),
  );
  assert.notEqual(
    adminReportParams("content", "page=2"),
    adminReportParams("content", "page=3"),
  );
});

test("a prefetched report opens from memory without another API call and stale data can be refreshed", async (t) => {
  const client = new QueryClient();
  t.after(() => client.clear());
  let reads = 0;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ total: ++reads, data: [] }),
  );
  const options = adminReportOptions<{ total: number }>("users", "page=1");
  await client.prefetchQuery(options);
  assert.equal(
    (await client.fetchQuery(adminReportOptions<{ total: number }>("users")))
      .total,
    1,
  );
  assert.equal(reads, 1);
  assert.equal(options.gcTime, 30 * 60_000);
  client.setQueryData(
    options.queryKey,
    { total: 1 },
    { updatedAt: Date.now() - 61_000 },
  );
  assert.equal((await client.fetchQuery(options)).total, 2);
  assert.equal(reads, 2);
});

test("pagination keeps visible rows while a new page loads", async (t) => {
  const client = new QueryClient();
  let finish!: (response: Response) => void;
  t.mock.method(
    globalThis,
    "fetch",
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  const first = adminReportOptions<{ page: number; data: string[] }>("users");
  client.setQueryData(first.queryKey, { page: 1, data: ["first"] });
  const observer = new QueryObserver(client, {
    ...first,
    placeholderData: keepPreviousData,
  });
  const unsubscribe = observer.subscribe(() => {});
  t.after(() => {
    unsubscribe();
    observer.destroy();
    client.clear();
  });
  const next = adminReportOptions<{ page: number; data: string[] }>(
    "users",
    "page=2",
  );
  observer.setOptions({ ...next, placeholderData: keepPreviousData });
  assert.equal(observer.getCurrentResult().isPlaceholderData, true);
  assert.deepEqual(observer.getCurrentResult().data, {
    page: 1,
    data: ["first"],
  });
  finish(Response.json({ page: 2, data: ["second"] }));
  await client.fetchQuery(next);
  assert.equal(observer.getCurrentResult().isPlaceholderData, false);
  assert.equal(observer.getCurrentResult().data?.page, 2);
});

test("clearing an admin session cache aborts in-flight requests and removes private results", async (t) => {
  const client = new QueryClient();
  t.after(() => client.clear());
  let aborted = false;
  t.mock.method(
    globalThis,
    "fetch",
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
  );
  client.setQueryData(adminReportOptions("users").queryKey, {
    data: ["private"],
  });
  const pending = client
    .fetchQuery(adminReportOptions("content"))
    .catch((error) => error);
  const inFlight = client
    .getQueryCache()
    .find({ queryKey: adminReportOptions("content").queryKey });
  client.clear();
  assert.ok(isCancelledError(await pending));
  // The cancelled query's finally block can schedule GC after cache removal.
  inFlight?.destroy();
  assert.equal(aborted, true);
  assert.equal(client.getQueryCache().getAll().length, 0);
});

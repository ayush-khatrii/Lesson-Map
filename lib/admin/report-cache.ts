import "server-only";
import { createHash } from "node:crypto";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { overviewData, usersData, contentData } from "./data";
import { reportRange } from "./filters";
import { adminReportParams } from "./report-query";

type Resource = "overview" | "users" | "content";
function tag(resource: Resource, query: string) {
  return `admin-report:${resource}:${createHash("sha256").update(query).digest("hex")}`;
}

async function cachedOverview(query: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag(tag("overview", query));
  return overviewData(reportRange(new URLSearchParams(query)));
}
async function cachedUsers(query: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag(tag("users", query));
  return usersData(new URLSearchParams(query));
}
async function cachedContent(query: string) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag(tag("content", query));
  return contentData(new URLSearchParams(query));
}

// The route must authorize the request before calling these shared data caches.
export function readAdminReport(
  resource: "overview",
  params: URLSearchParams,
): ReturnType<typeof cachedOverview>;
export function readAdminReport(
  resource: "users",
  params: URLSearchParams,
): ReturnType<typeof cachedUsers>;
export function readAdminReport(
  resource: "content",
  params: URLSearchParams,
): ReturnType<typeof cachedContent>;
export function readAdminReport(resource: Resource, params: URLSearchParams) {
  const query = adminReportParams(resource, params.toString());
  if (params.get("refresh") === "true")
    revalidateTag(tag(resource, query), { expire: 0 });
  if (resource === "overview") return cachedOverview(query);
  if (resource === "users") return cachedUsers(query);
  return cachedContent(query);
}

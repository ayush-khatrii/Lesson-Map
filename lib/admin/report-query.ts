// Shared by navigation prefetching, client queries, and server report caches.
const parameters: Record<string, readonly string[]> = {
  overview: ["period", "from", "to"],
  users: [
    "q",
    "page",
    "pageSize",
    "sort",
    "direction",
    "plan",
    "paid",
    "active",
    "cancelling",
    "verified",
    "joinedFrom",
    "joinedTo",
    "minCourses",
    "maxCourses",
  ],
  content: [
    "q",
    "page",
    "pageSize",
    "sort",
    "direction",
    "published",
    "public",
  ],
  revenue: [
    "period",
    "from",
    "to",
    "currency",
    "q",
    "page",
    "pageSize",
    "status",
    "plan",
  ],
  access: [],
};

export function adminReportParams(resource: string, search: string) {
  const source = new URLSearchParams(search);
  const params = new URLSearchParams();
  const defaults: Record<string, string> = {
    period: "30d",
    currency: "USD",
    page: "1",
    pageSize: "25",
    direction: "desc",
    sort: resource === "users" ? "accountAgeDays" : "createdAt",
  };
  for (const key of parameters[resource] ?? []) {
    const raw = source.get(key);
    const value = key === "q" ? raw?.trim() : raw;
    if (
      value &&
      value !== defaults[key] &&
      (value !== "all" || key === "period")
    )
      params.set(key, value);
  }
  params.sort();
  return params.toString();
}

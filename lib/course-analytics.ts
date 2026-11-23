export const METRICS = ["visits", "starts", "signups", "clicks"] as const;
export type Metric = (typeof METRICS)[number];
export type AnalyticsRange = "7d" | "30d" | "all";
export type Counts = Record<Metric, number>;
export type AnalyticsBucket = Counts & { date: string };
export type AnalyticsData = {
  totals: Counts;
  buckets: AnalyticsBucket[];
  interval: { from: string; to: string; granularity: "day" | "month" };
  range: AnalyticsRange;
};
export type DailyCount = { date: string; metric: string; count: number };
const empty = (): Counts => ({ visits: 0, starts: 0, signups: 0, clicks: 0 });
export function analyticsWindow(
  range: AnalyticsRange,
  createdAt: Date,
  now = new Date(),
) {
  const to = new Date(now);
  to.setUTCHours(0, 0, 0, 0);
  to.setUTCDate(to.getUTCDate() + 1);
  const from = range === "all" ? new Date(createdAt) : new Date(to);
  from.setUTCHours(0, 0, 0, 0);
  if (range !== "all")
    from.setUTCDate(from.getUTCDate() - (range === "7d" ? 7 : 30));
  const granularity =
    range === "all" && (to.getTime() - from.getTime()) / 86400000 > 90
      ? ("month" as const)
      : ("day" as const);
  return { from, to, granularity };
}
export function buildAnalytics(
  range: AnalyticsRange,
  window: ReturnType<typeof analyticsWindow>,
  rows: DailyCount[],
): AnalyticsData {
  const totals = empty();
  const buckets = new Map<string, AnalyticsBucket>();
  const cursor = new Date(window.from);
  if (window.granularity === "month") cursor.setUTCDate(1);
  const key = (date: string) =>
    window.granularity === "month"
      ? `${date.slice(0, 7)}-01`
      : date.slice(0, 10);
  while (cursor < window.to) {
    const date = key(cursor.toISOString());
    buckets.set(date, { date, ...empty() });
    if (window.granularity === "month")
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  for (const row of rows) {
    if (!METRICS.includes(row.metric as Metric)) continue;
    const date = new Date(row.date);
    if (date < window.from || date >= window.to) continue;
    const bucket = buckets.get(key(row.date));
    if (!bucket) continue;
    const metric = row.metric as Metric;
    bucket[metric] += Number(row.count);
    totals[metric] += Number(row.count);
  }
  return {
    range,
    totals,
    buckets: [...buckets.values()],
    interval: {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      granularity: window.granularity,
    },
  };
}

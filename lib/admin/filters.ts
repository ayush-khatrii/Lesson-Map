import { z } from "zod";

export const REPORT_TIME_ZONE = "Asia/Kolkata";
export const DAY_MS = 86400000;
export function dateKey(value: Date | string | number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const date = new Date(`${v}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v
    );
  }, "Enter a valid date.");
const optionalBoolean = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "true"));
export const reportQuery = z.object({
  period: z.enum(["7d", "30d", "90d", "all", "custom"]).default("30d"),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .refine(
      (value) => Intl.supportedValuesOf("currency").includes(value),
      "Choose a supported currency.",
    )
    .default("USD"),
  refresh: z.enum(["true", "false"]).optional(),
});
export const tableQuery = z.object({
  q: z.string().trim().max(200).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]))
    .default(25),
  direction: z.enum(["asc", "desc"]).default("desc"),
});
export const userQuery = tableQuery
  .extend({
    sort: z
      .enum([
        "name",
        "email",
        "courses",
        "modules",
        "lessons",
        "publishedCourses",
        "accountAgeDays",
      ])
      .default("accountAgeDays"),
    plan: z.enum(["FREE", "CREATOR", "PROFESSIONAL"]).optional(),
    paid: optionalBoolean,
    active: optionalBoolean,
    cancelling: optionalBoolean,
    verified: optionalBoolean,
    joinedFrom: calendarDate.optional(),
    joinedTo: calendarDate.optional(),
    minCourses: z.coerce.number().int().min(0).max(10000000).optional(),
    maxCourses: z.coerce.number().int().min(0).max(10000000).optional(),
  })
  .refine(
    (v) =>
      v.minCourses === undefined ||
      v.maxCourses === undefined ||
      v.minCourses <= v.maxCourses,
    "Minimum courses cannot exceed maximum courses.",
  )
  .refine(
    (value) =>
      !value.joinedFrom ||
      !value.joinedTo ||
      value.joinedFrom <= value.joinedTo,
    "Signup dates must be in chronological order.",
  );
export const contentQuery = tableQuery.extend({
  sort: z
    .enum(["createdAt", "courseName", "modules", "lessons"])
    .default("createdAt"),
  published: optionalBoolean,
  public: optionalBoolean,
});

export function queryValues(params: URLSearchParams) {
  return Object.fromEntries(
    [...params.entries()].filter(
      ([key, value]) => value !== "" && (value !== "all" || key === "period"),
    ),
  );
}

export type ReportRange = {
  from: Date;
  to: Date;
  previousFrom: Date | null;
  currency: string;
  period: string;
};

export function monthlyChart(range: ReportRange) {
  return range.to.getTime() - range.from.getTime() > 366 * DAY_MS;
}

// Include zero-activity dates so gaps never look like sustained activity.
export function chartDateKeys(range: ReportRange, observed: string[]) {
  if (!observed.length) return [];
  const monthly = monthlyChart(range);
  const first =
    range.period === "all" ? [...observed].sort()[0] : dateKey(range.from);
  const last = dateKey(range.to.getTime() - 1);
  const start = monthly ? `${first.slice(0, 7)}-01` : first.slice(0, 10);
  const end = monthly ? last.slice(0, 7) : last;
  const cursor = new Date(`${start}T00:00:00Z`);
  const keys: string[] = [];
  while (
    (monthly
      ? cursor.toISOString().slice(0, 7)
      : cursor.toISOString().slice(0, 10)) <= end
  ) {
    keys.push(cursor.toISOString().slice(0, monthly ? 7 : 10));
    if (monthly) cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}
export function reportRange(
  params: URLSearchParams,
  now = new Date(),
): ReportRange {
  now = new Date(Math.floor(now.getTime() / 60000) * 60000);
  const query = reportQuery.parse(queryValues(params));
  const to = query.to
    ? new Date(
        Math.min(
          now.getTime(),
          new Date(`${query.to}T00:00:00+05:30`).getTime() + DAY_MS,
        ),
      )
    : now;
  const from =
    query.period === "all"
      ? new Date(0)
      : query.period === "custom"
        ? query.from
          ? new Date(`${query.from}T00:00:00+05:30`)
          : new Date(NaN)
        : new Date(to.getTime() - Number.parseInt(query.period, 10) * DAY_MS);
  if (!Number.isFinite(from.getTime()) || from >= to)
    throw new z.ZodError([
      {
        code: "custom",
        path: ["from"],
        message: "Choose a start date before the end date.",
      },
    ]);
  return {
    from,
    to,
    previousFrom:
      query.period === "all"
        ? null
        : new Date(from.getTime() - (to.getTime() - from.getTime())),
    currency: query.currency,
    period: query.period,
  };
}

export function percentageChange(
  current: number,
  previous: number,
): number | "new" {
  return previous === 0
    ? current === 0
      ? 0
      : "new"
    : Math.round(((current - previous) / previous) * 1000) / 10;
}

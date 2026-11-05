import "server-only";
import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/prisma";
import {
  contentQuery,
  queryValues,
  userQuery,
  type ReportRange,
  monthlyChart,
  chartDateKeys,
} from "./filters";
import type { UserRow, ContentRow } from "./contracts";

function effectivePlan(now: Date) {
  return Prisma.sql`CASE WHEN u."plan" <> 'FREE' AND u."subscriptionStatus" = 'active'
    AND (NOT u."subscriptionCancelAtPeriodEnd" OR u."subscriptionCurrentPeriodEnd" > ${now})
    THEN u."plan"::text ELSE 'FREE' END`;
}

export async function overviewData(range: ReportRange) {
  const now = new Date();
  const [
    courses,
    modules,
    lessons,
    plans,
    usersWithCourses,
    signups,
    previous,
    trend,
  ] = await Promise.all([
    db.course.count(),
    db.module.count(),
    db.lesson.count(),
    db.$queryRaw<
      { plan: string; count: number; cancelling: number }[]
    >`SELECT ${effectivePlan(now)} AS plan,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE u."subscriptionCancelAtPeriodEnd")::int AS cancelling
      FROM "user" u GROUP BY 1`,
    db.user.count({ where: { Course: { some: {} } } }),
    db.user.count({ where: { createdAt: { gte: range.from, lt: range.to } } }),
    range.previousFrom
      ? db.user.count({
          where: { createdAt: { gte: range.previousFrom, lt: range.from } },
        })
      : Promise.resolve(null),
    db.$queryRaw<
      { date: string; users: number }[]
    >`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS users FROM "user" WHERE "createdAt" >= ${range.from} AND "createdAt" < ${range.to} GROUP BY 1 ORDER BY 1`,
  ]);
  const count = (plan: string) =>
    plans.find((p) => p.plan === plan)?.count ?? 0;
  const creator = count("CREATOR"),
    professional = count("PROFESSIONAL"),
    free = count("FREE");
  const grouped = new Map<string, number>();
  for (const point of trend) {
    const date = monthlyChart(range) ? point.date.slice(0, 7) : point.date;
    grouped.set(date, (grouped.get(date) ?? 0) + point.users);
  }
  return {
    totals: {
      users: free + creator + professional,
      courses,
      modules,
      lessons,
      paid: creator + professional,
      free,
      creator,
      professional,
      withCourses: usersWithCourses,
      cancelling: plans
        .filter((p) => p.plan !== "FREE")
        .reduce((sum, p) => sum + p.cancelling, 0),
    },
    signups: {
      current: signups,
      previous,
      trend: chartDateKeys(range, [...grouped.keys()]).map((date) => ({
        date,
        users: grouped.get(date) ?? 0,
      })),
    },
  };
}

export async function usersData(params: URLSearchParams) {
  const query = userQuery.parse(queryValues(params));
  const now = new Date();
  const cte = Prisma.sql`WITH course_counts AS (
      SELECT "userId", COUNT(*)::int AS courses, COUNT(*) FILTER (WHERE "isPublished")::int AS published FROM "Course" GROUP BY "userId"
    ), module_counts AS (
      SELECT c."userId", COUNT(*)::int AS modules FROM "Module" m JOIN "Course" c ON c.id = m."courseId" GROUP BY c."userId"
    ), lesson_counts AS (
      SELECT c."userId", COUNT(*)::int AS lessons FROM "Lesson" l JOIN "Module" m ON m.id = l."moduleId" JOIN "Course" c ON c.id = m."courseId" GROUP BY c."userId"
    ), enriched AS (
      SELECT u.id, u.name, u.email, u."emailVerified", u."createdAt", ${effectivePlan(now)} AS plan,
        COALESCE(c.courses,0) AS courses, COALESCE(c.published,0) AS "publishedCourses",
        COALESCE(m.modules,0) AS modules, COALESCE(l.lessons,0) AS lessons,
        u."subscriptionCancelAtPeriodEnd" AS cancelling,
        COALESCE(u."subscriptionStatus" = 'active', false) AND (${effectivePlan(now)}) <> 'FREE' AS "isActive",
        GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (${now}::timestamp - u."createdAt"))/86400))::int AS "accountAgeDays"
      FROM "user" u LEFT JOIN course_counts c ON c."userId"=u.id LEFT JOIN module_counts m ON m."userId"=u.id LEFT JOIN lesson_counts l ON l."userId"=u.id
    ), filtered AS (SELECT * FROM enriched WHERE
      (${query.q === ""} OR name ILIKE ${`%${query.q}%`} OR email ILIKE ${`%${query.q}%`})
      ${query.plan ? Prisma.sql`AND plan = ${query.plan}` : Prisma.empty}
      ${query.paid !== undefined ? Prisma.sql`AND (plan <> 'FREE') = ${query.paid}` : Prisma.empty}
      ${query.active !== undefined ? Prisma.sql`AND "isActive" = ${query.active}` : Prisma.empty}
      ${query.cancelling !== undefined ? Prisma.sql`AND cancelling = ${query.cancelling}` : Prisma.empty}
      ${query.verified !== undefined ? Prisma.sql`AND "emailVerified" = ${query.verified}` : Prisma.empty}
      ${query.minCourses !== undefined ? Prisma.sql`AND courses >= ${query.minCourses}` : Prisma.empty}
      ${query.maxCourses !== undefined ? Prisma.sql`AND courses <= ${query.maxCourses}` : Prisma.empty}
      ${query.joinedFrom ? Prisma.sql`AND "createdAt" >= ${new Date(`${query.joinedFrom}T00:00:00+05:30`)}` : Prisma.empty}
      ${query.joinedTo ? Prisma.sql`AND "createdAt" < ${new Date(new Date(`${query.joinedTo}T00:00:00+05:30`).getTime() + 86400000)}` : Prisma.empty}
    )`;
  // Both identifiers come from strict enums, never from raw caller input.
  const order = Prisma.raw(
    `"${query.sort}" ${query.direction.toUpperCase()}, id ASC`,
  );
  const [rows, total] = await db.$transaction([
    db.$queryRaw<
      UserRow[]
    >`${cte} SELECT id,name,email,courses,modules,lessons,"publishedCourses","emailVerified","accountAgeDays",cancelling,"isActive",
      (plan <> 'FREE') AS "isPaid",(plan='FREE') AS "isFree",(plan='CREATOR') AS "isCreator",(plan='PROFESSIONAL') AS "isProfessional"
      FROM filtered ORDER BY ${order} LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
    db.$queryRaw<
      { count: number }[]
    >`${cte} SELECT COUNT(*)::int AS count FROM filtered`,
  ]);
  return {
    data: rows,
    total: total[0].count,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function contentData(params: URLSearchParams) {
  const query = contentQuery.parse(queryValues(params));
  const cte = Prisma.sql`WITH module_counts AS (SELECT "courseId", COUNT(*)::int AS modules FROM "Module" GROUP BY "courseId"),
    lesson_counts AS (SELECT m."courseId",COUNT(*)::int AS lessons FROM "Lesson" l JOIN "Module" m ON m.id=l."moduleId" GROUP BY m."courseId"),
    filtered AS (
      SELECT c.id,c."courseName",c."isPublic",c."isPublished",c."createdAt",u.name,u.email,
        COALESCE(m.modules,0) AS modules,COALESCE(l.lessons,0) AS lessons
      FROM "Course" c JOIN "user" u ON u.id=c."userId" LEFT JOIN module_counts m ON m."courseId"=c.id LEFT JOIN lesson_counts l ON l."courseId"=c.id
      WHERE (${query.q === ""} OR c."courseName" ILIKE ${`%${query.q}%`} OR u.name ILIKE ${`%${query.q}%`} OR u.email ILIKE ${`%${query.q}%`})
      ${query.published !== undefined ? Prisma.sql`AND c."isPublished"=${query.published}` : Prisma.empty}
      ${query.public !== undefined ? Prisma.sql`AND c."isPublic"=${query.public}` : Prisma.empty}
    )`;
  const [rows, total] = await db.$transaction([
    db.$queryRaw<
      (Omit<ContentRow, "createdAt"> & { createdAt: Date })[]
    >`${cte} SELECT * FROM filtered ORDER BY ${Prisma.raw(`"${query.sort}" ${query.direction.toUpperCase()}, id ASC`)} LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
    db.$queryRaw<
      { count: number }[]
    >`${cte} SELECT COUNT(*)::int AS count FROM filtered`,
  ]);
  return {
    data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    total: total[0].count,
    page: query.page,
    pageSize: query.pageSize,
  };
}

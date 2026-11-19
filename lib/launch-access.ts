import {
  courseActionFailure,
  courseActionDiagnostics,
} from "@/lib/course-action-error";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function sessionUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.session.userId;
}

// Same atomic fixed-window counter used by the existing admin routes.
export async function allowRequest(key: string, limit: number) {
  const now = BigInt(Date.now());
  const windowStart = now - BigInt(60000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "rateLimit" ("id", "key", "count", "lastRequest") VALUES (${crypto.randomUUID()}, ${`launch:${key}`}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rateLimit"."lastRequest" <= ${windowStart} THEN 1 ELSE "rateLimit"."count" + 1 END,
      "lastRequest" = CASE WHEN "rateLimit"."lastRequest" <= ${windowStart} THEN ${now} ELSE "rateLimit"."lastRequest" END
    RETURNING "count"`;
  return rows[0].count <= limit;
}

export function launchError(
  error: unknown,
  context?: { requestId: string; stage: string },
) {
  if (context) {
    const failure = courseActionFailure(error);
    console.error("Course action failed", {
      ...context,
      code: failure.code,
      ...courseActionDiagnostics(error),
    });
    return NextResponse.json(
      {
        error: failure.error,
        code: failure.code,
        requestId: context.requestId,
      },
      { status: failure.status },
    );
  }
  console.error(
    "Course action failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return NextResponse.json(
    { error: "Could not complete this action. Please try again." },
    { status: 500 },
  );
}

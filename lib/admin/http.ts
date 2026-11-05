import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/payments/request-security";
import { requireAdmin, AdminError } from "./guard";
import type { Prisma } from "@/app/generated/prisma/client";

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function adminEndpoint(
  handler: (
    request: Request,
    admin: Awaited<ReturnType<typeof requireAdmin>>,
  ) => Promise<unknown>,
  options: {
    verified?: boolean;
    fresh?: boolean;
    superAdmin?: boolean;
    touch?: boolean;
  } = {},
) {
  return async (request: Request) => {
    try {
      if (request.method !== "GET" && !isSameOriginRequest(request))
        throw new AdminError(403, "INVALID_ORIGIN", "Invalid request origin.");
      const admin = await requireAdmin({
        ...options,
        requestHeaders: request.headers,
      });
      const result = await handler(request, admin);
      // Only explicit foreground activity extends the idle window; polling cannot.
      if (
        request.method !== "GET" &&
        options.touch !== false &&
        options.verified !== false
      ) {
        await db.adminSession.updateMany({
          where: { id: admin.session.id },
          data: { lastActivityAt: new Date() },
        });
      }
      return privateJson(result);
    } catch (error) {
      if (error instanceof AdminError)
        return privateJson(
          { error: error.message, code: error.code },
          error.status,
        );
      if (error instanceof ZodError)
        return privateJson(
          {
            error: "Check the supplied values.",
            fields: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
          400,
        );
      console.error("Admin request failed", {
        path: new URL(request.url).pathname,
        type: error instanceof Error ? error.name : "Unknown",
      });
      return privateJson(
        { error: "This request could not be completed. Please try again." },
        503,
      );
    }
  };
}

export async function readJson(request: Request) {
  const raw = await request.text();
  if (raw.length > 16384)
    throw new AdminError(413, "TOO_LARGE", "Request is too large.");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new AdminError(400, "INVALID_JSON", "Invalid request.");
  }
}

export async function audit(
  actorUserId: string | null,
  action: string,
  targetId?: string,
  details?: Prisma.InputJsonValue,
) {
  await db.adminAuditLog.create({
    data: { actorUserId, action, targetId, ...(details ? { details } : {}) },
  });
}

export async function throttle(key: string, max = 5, windowMs = 60000) {
  const now = BigInt(Date.now());
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "AdminRateLimit" ("id", "key", "count", "lastRequest") VALUES (${crypto.randomUUID()}, ${`admin:${key}`}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AdminRateLimit"."lastRequest" <= ${now - BigInt(windowMs)} THEN 1 ELSE "AdminRateLimit"."count" + 1 END,
      "lastRequest" = CASE WHEN "AdminRateLimit"."lastRequest" <= ${now - BigInt(windowMs)} THEN ${now} ELSE "AdminRateLimit"."lastRequest" END
    RETURNING "count"`;
  if (rows[0].count > max)
    throw new AdminError(
      429,
      "RATE_LIMITED",
      "Too many attempts. Please wait before trying again.",
    );
}

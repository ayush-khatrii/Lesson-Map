import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { AiError } from "./http";

// Shared error mapping for the AI routes. Upstream details, credentials and
// prompts are never forwarded to the browser.
export function aiFailure(error: unknown) {
  if (error instanceof AiError) {
    return NextResponse.json(
      { error: error.message, newRequest: error.newRequest },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          ...(error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}),
        },
      },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error: "Your account session is no longer valid. Please sign in again and retry.",
          newRequest: true,
        },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("AI Prisma failure", { code: error.code, meta: error.meta });
  } else {
    console.error("AI request failed", {
      kind: error instanceof Error ? error.name : "Unknown",
    });
  }

  return NextResponse.json(
    {
      error:
        "Could not finish the request. Retry with the same details to check its status.",
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function aiUserIdFor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session.userId) throw new AiError(401, "Please sign in first.");
  return session.session.userId;
}

// Cookie-authenticated, same-origin JSON requests only (CSRF protection).
export function assertSameOriginJson(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(process.env.NEXT_PUBLIC_BASE_URL || request.url).origin;
  if (!origin || origin !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AiError(403, "Please continue from this website.");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new AiError(415, "Send a JSON request.");
  }
}

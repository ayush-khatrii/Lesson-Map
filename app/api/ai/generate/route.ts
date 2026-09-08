import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { generateCourseSchema } from "@/lib/ai/schema";
import { AiError, readLimitedJson } from "@/lib/ai/http";
import { createAiCourse, getAiAllowance } from "@/lib/ai/service";

export const runtime = "nodejs";
export const maxDuration = 60;

function failure(error: unknown) {
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
  // Never log arbitrary provider responses, request bodies, or credentials.
  console.error("AI course request failed", { kind: error instanceof Error ? error.name : "Unknown" });
  return NextResponse.json(
    { error: "Could not finish the request. Retry with the same details to check its status." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

async function userIdFor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session.userId) throw new AiError(401, "Please sign in first.");
  return session.session.userId;
}

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getAiAllowance(await userIdFor(request)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    // Cookie-authenticated, same-origin JSON requests only (CSRF protection).
    const origin = request.headers.get("origin");
    const expectedOrigin = new URL(process.env.NEXT_PUBLIC_BASE_URL || request.url).origin;
    if (!origin || origin !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
      throw new AiError(403, "Please generate courses from this website.");
    }
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      throw new AiError(415, "Send a JSON request.");
    }
    const userId = await userIdFor(request);
    const body = await readLimitedJson(request.body, 4096);
    const parsed = generateCourseSchema.safeParse(body);
    if (!parsed.success) {
      throw new AiError(400, "Enter a topic, audience, and valid module and lesson counts.");
    }
    const result = await createAiCourse(userId, parsed.data);
    return NextResponse.json(result, {
      status: result.replayed ? 200 : 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}

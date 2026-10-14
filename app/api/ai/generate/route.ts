import { NextResponse } from "next/server";
import { generateCourseSchema } from "@/lib/ai/schema";
import { AiError, readLimitedJson } from "@/lib/ai/http";
import { createAiCourse, getAiAllowance } from "@/lib/ai/service";
import { aiFailure, aiUserIdFor, assertSameOriginJson } from "@/lib/ai/route-helpers";

export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getAiAllowance(await aiUserIdFor(request)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return aiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginJson(request);
    const userId = await aiUserIdFor(request);
    const body = await readLimitedJson(request.body, 4096);
    const parsed = generateCourseSchema.safeParse(body);
    if (!parsed.success) {
      throw new AiError(400, parsed.error.issues[0].message);
    }
    const result = await createAiCourse(userId, parsed.data);
    return NextResponse.json(result, {
      status: result.replayed ? 200 : 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return aiFailure(error);
  }
}

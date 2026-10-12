import { NextResponse } from "next/server";
import { reviseCourseSchema } from "@/lib/ai/schema";
import { AiError, readLimitedJson } from "@/lib/ai/http";
import { editAiCourse } from "@/lib/ai/service";
import { aiFailure, aiUserIdFor, assertSameOriginJson } from "@/lib/ai/route-helpers";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    assertSameOriginJson(request);
    const userId = await aiUserIdFor(request);
    // The client only sends instructions and counts; the existing outline is read
    // from the database, so a small body limit is enough.
    const body = await readLimitedJson(request.body, 8192);
    const parsed = reviseCourseSchema.safeParse(body);
    if (!parsed.success) {
      throw new AiError(
        400,
        "Describe the changes you want and choose valid module and lesson counts.",
      );
    }
    const result = await editAiCourse(userId, parsed.data);
    return NextResponse.json(result, {
      status: result.replayed ? 200 : 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return aiFailure(error);
  }
}

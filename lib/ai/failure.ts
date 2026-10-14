import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { AiError } from "./http";

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

// Log schema identifiers, never the raw error/adapter metadata: those can contain
// SQL parameters, generated content, or database connection details.
export function logAiFailure(error: unknown, context: {
  operation?: "generate" | "revise";
  generationId?: string;
} = {}) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = record(error.meta);
    const constraint = record(record(record(meta.driverAdapterError).cause).constraint);
    console.error("AI database failure", {
      ...context,
      code: error.code,
      model: typeof meta.modelName === "string" ? meta.modelName : undefined,
      constraint: typeof constraint.index === "string" ? constraint.index
        : typeof meta.constraint === "string" ? meta.constraint
          : typeof meta.field_name === "string" ? meta.field_name : undefined,
    });
  } else {
    console.error("AI request failed", {
      ...context,
      kind: error instanceof Error ? error.name : "Unknown",
    });
  }
}

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

  // P2003 can concern Course, Module, Lesson, or AiGeneration. Only an actual
  // authentication/user lookup failure should tell the user to sign in again.
  logAiFailure(error);
  return NextResponse.json(
    {
      error: "Could not finish the request. Retry with the same details to check its status.",
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

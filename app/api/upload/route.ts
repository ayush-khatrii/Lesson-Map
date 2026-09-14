import { NextResponse } from "next/server";
import { generatePresignedUrl } from "@/lib/r2/generatePresignedUrl";
import { R2NotConfiguredError } from "@/lib/r2/r2-client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { z } from "zod";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/r2/upload-policy";

const uploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_UPLOAD_TYPES),
  lessonId: z.string().min(1),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized! Please login to continue" },
        { status: 401 },
      );
    }

    const parsed = uploadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Choose a supported image or PDF between 1 byte and 25 MB.",
        },
        { status: 400 },
      );
    }
    const { filename, contentType, lessonId, size } = parsed.data;
    const lesson = await db.lesson.findFirst({
      where: { id: lessonId, module: { course: { userId } } },
      select: { id: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    const result = await generatePresignedUrl(
      filename,
      contentType,
      userId,
      lessonId,
      size,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof R2NotConfiguredError) {
      console.error("Error creating upload URL: R2 is not configured");
      return NextResponse.json(
        { error: "File uploads are temporarily unavailable." },
        { status: 503 },
      );
    }
    console.error("Error creating upload URL:", error);
    return NextResponse.json(
      {
        error: "Failed to create upload URL",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

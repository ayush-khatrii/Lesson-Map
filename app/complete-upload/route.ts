import { db } from "@/lib/prisma";
import { userCoursesTag } from "@/lib/course-cache";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { createResourceSchema } from "@/lib/validation";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_SAVE_WINDOW_MS,
} from "@/lib/r2/upload-policy";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to continue." },
        { status: 401 },
      );
    }

    const parsed = createResourceSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid resource details." },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const key = data.key;
    if (
      !key ||
      !key.startsWith(`lesson-resources/${userId}/`) ||
      !["PDF", "Image"].includes(data.type)
    ) {
      return NextResponse.json(
        { error: "Invalid upload. Select the file again." },
        { status: 400 },
      );
    }
    const lesson = await db.lesson.findFirst({
      where: { id: data.lessonId, module: { course: { userId } } },
      select: { id: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Retrying a successful save must not create a duplicate resource.
    const existing = await db.resource.findFirst({
      where: { key, lessonId: data.lessonId },
    });
    if (existing) return NextResponse.json(existing);

    const { r2 } = await import("@/lib/r2/r2-client");
    let object;
    try {
      object = await r2.send(new HeadObjectCommand({
        Bucket: process.env.CF_R2_BUCKET_NAME || "lesson-map",
        Key: key,
      }));
    } catch (error) {
      if (
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      ) {
        return NextResponse.json(
          { error: "Uploaded file not found. Please upload it again." },
          { status: 400 },
        );
      }
      throw error;
    }
    const size = object.ContentLength;
    const contentType = object.ContentType;
    if (
      object.Metadata?.uploader !== userId ||
      object.Metadata?.lesson !== data.lessonId ||
      !size ||
      size > MAX_UPLOAD_BYTES ||
      size !== data.size ||
      object.Metadata?.size !== String(size) ||
      !contentType ||
      !ALLOWED_UPLOAD_TYPES.some((allowed) => allowed === contentType) ||
      contentType !== data.contentType ||
      (data.type === "PDF"
        ? contentType !== "application/pdf"
        : !contentType.startsWith("image/"))
    ) {
      return NextResponse.json(
        {
          error:
            "The uploaded file does not match its approved size, type, or owner. Upload it again.",
        },
        { status: 400 },
      );
    }
    // Cleanup only handles objects older than 24h; new attachments expire after 1h.
    if (
      !object.LastModified ||
      Date.now() - object.LastModified.getTime() > UPLOAD_SAVE_WINDOW_MS
    ) {
      return NextResponse.json(
        { error: "This upload expired. Please select the file again." },
        { status: 400 },
      );
    }
    const resource = await db.$transaction(async (tx) => {
      // Serialize retries for the same object without changing existing resource IDs.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      const saved = await tx.resource.findFirst({ where: { key } });
      if (saved) return saved;
      return tx.resource.create({
        data: {
          ...data,
          key,
          size,
          contentType,
          content: null,
          // File access is resolved through the authorized open endpoint.
          url: null,
        },
      });
    });
    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error("Failed to save uploaded resource:", error);
    // The scheduled reconciler removes unreferenced uploads, including DB failures.
    // Never delete here: a concurrent request may have successfully saved the file.
    return NextResponse.json(
      { error: "Failed to save resource. Please try again." },
      { status: 500 },
    );
  }
}

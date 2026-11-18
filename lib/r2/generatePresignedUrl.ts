import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, getR2Bucket } from "./r2-client";
import { db } from "@/lib/prisma";
import { lockCourseOwner } from "@/lib/course-access";
import { effectiveAiPlan } from "@/lib/ai/schema";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_LIMITS,
  UPLOAD_URL_TTL_SECONDS,
  type UploadStorage,
} from "./upload-policy";

export class UploadLimitError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
    public storage?: UploadStorage,
  ) {
    super(message);
    this.name = "UploadLimitError";
  }
}

async function storageUsage(
  tx: Prisma.TransactionClient,
  userId: string,
  limitBytes: number,
): Promise<UploadStorage> {
  // Pending and deleted-but-not-cleaned objects stay charged. Count legacy
  // resources separately, without double-counting files already in the ledger.
  const rows = await tx.$queryRaw<{ bytes: bigint }[]>`
    SELECT COALESCE(SUM(bytes), 0)::bigint AS bytes FROM (
      SELECT "size"::bigint AS bytes FROM "UploadAllocation" WHERE "userId" = ${userId}
      UNION ALL
      SELECT MAX(CASE WHEN r."size" > 0 THEN r."size" ELSE ${MAX_UPLOAD_BYTES} END)::bigint AS bytes
      FROM "Resource" r
      JOIN "Lesson" l ON l."id" = r."lessonId"
      JOIN "Module" m ON m."id" = l."moduleId"
      JOIN "Course" c ON c."id" = m."courseId"
      WHERE c."userId" = ${userId}
        AND (r."key" IS NOT NULL OR r."type" IN ('PDF', 'Image', 'Document', 'Spreadsheet'))
        AND NOT EXISTS (SELECT 1 FROM "UploadAllocation" a WHERE a."key" = r."key")
      GROUP BY COALESCE(r."key", r."url", r."id")
    ) usage
  `;
  return { usedBytes: Number(rows[0].bytes), limitBytes };
}

export async function getUploadStorage(userId: string): Promise<UploadStorage> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user)
    throw new UploadLimitError(401, "UNAUTHORIZED", "Please sign in again.");
  return storageUsage(
    db,
    userId,
    UPLOAD_LIMITS[effectiveAiPlan(user)].storageBytes,
  );
}

async function reserveUpload(
  userId: string,
  lessonId: string,
  key: string,
  size: number,
) {
  const result = await db.$transaction(async (tx) => {
    // Serializes quota decisions across tabs and server instances.
    const user = await lockCourseOwner(tx, userId);
    if (!user)
      return {
        error: new UploadLimitError(
          401,
          "UNAUTHORIZED",
          "Please sign in again.",
        ),
      };
    const limits = UPLOAD_LIMITS[effectiveAiPlan(user)];
    const now = BigInt(Date.now());
    const start = now - BigInt(60000);
    const counter = await tx.$queryRaw<
      { count: number; lastRequest: bigint }[]
    >`
      INSERT INTO "rateLimit" ("id", "key", "count", "lastRequest")
      VALUES (${randomUUID()}, ${`upload:${userId}`}, 1, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "rateLimit"."lastRequest" <= ${start} THEN 1 ELSE "rateLimit"."count" + 1 END,
        "lastRequest" = CASE WHEN "rateLimit"."lastRequest" <= ${start} THEN ${now} ELSE "rateLimit"."lastRequest" END
      RETURNING "count", "lastRequest"
    `;
    if (counter[0].count > limits.requestsPerMinute) {
      const retryAfter = Math.max(
        1,
        Math.ceil(
          (Number(counter[0].lastRequest) + 60000 - Number(now)) / 1000,
        ),
      );
      return {
        error: new UploadLimitError(
          429,
          "UPLOAD_RATE_LIMIT",
          "Too many uploads. Please try again shortly.",
          retryAfter,
        ),
      };
    }
    const storage = await storageUsage(tx, userId, limits.storageBytes);
    if (size > storage.limitBytes - storage.usedBytes) {
      return {
        error: new UploadLimitError(
          403,
          "STORAGE_QUOTA_EXCEEDED",
          "Your account storage is full. Delete unused files or upgrade your plan. Unfinished uploads remain reserved until cleanup.",
          undefined,
          storage,
        ),
      };
    }
    await tx.uploadAllocation.create({ data: { key, userId, lessonId, size } });
    return { storage: { ...storage, usedBytes: storage.usedBytes + size } };
  });
  // Rejected attempts still consume their rate allowance.
  if (result.error) throw result.error;
  return result.storage;
}

export async function generatePresignedUrl(
  filename: string,
  contentType: string,
  userId: string,
  lessonId: string,
  size: number,
) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160);
  const key = `lesson-resources/${userId}/${randomUUID()}-${safeName}`;
  const storage = await reserveUpload(userId, lessonId, key, size);
  const uploadHeaders = {
    "Content-Type": contentType,
    "If-None-Match": "*",
    "x-amz-meta-uploader": userId,
    "x-amz-meta-lesson": lessonId,
    "x-amz-meta-size": String(size),
  };
  const metadataHeaders = new Set([
    "x-amz-meta-uploader",
    "x-amz-meta-lesson",
    "x-amz-meta-size",
  ]);
  try {
    const uploadUrl = await getSignedUrl(
      getR2(),
      new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: key,
        ContentType: contentType,
        ContentLength: size,
        IfNoneMatch: "*",
        Metadata: { uploader: userId, lesson: lessonId, size: String(size) },
      }),
      {
        expiresIn: UPLOAD_URL_TTL_SECONDS,
        signableHeaders: new Set([
          "content-type",
          "content-length",
          "if-none-match",
          ...metadataHeaders,
        ]),
        unhoistableHeaders: metadataHeaders,
      },
    );
    return { uploadUrl, uploadHeaders, key, storage };
  } catch (error) {
    // No URL was returned. Failed release stays conservatively charged until
    // cleanup retries, rather than risking unaccounted storage.
    await db.uploadAllocation
      .deleteMany({ where: { key, savedAt: null } })
      .catch(() => {});
    throw error;
  }
}

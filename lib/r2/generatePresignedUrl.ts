import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "./r2-client";

export async function generatePresignedUrl(
  filename: string,
  contentType: string,
  userId: string,
  lessonId: string,
  size: number,
) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160);
  const key = `lesson-resources/${userId}/${randomUUID()}-${safeName}`;
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
  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: process.env.CF_R2_BUCKET_NAME || "lesson-map",
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      IfNoneMatch: "*",
      Metadata: { uploader: userId, lesson: lessonId, size: String(size) },
    }),
    {
      expiresIn: 300,
      signableHeaders: new Set([
        "content-type",
        "content-length",
        "if-none-match",
        ...metadataHeaders,
      ]),
      unhoistableHeaders: metadataHeaders,
    },
  );
  return { uploadUrl, uploadHeaders, key };
}

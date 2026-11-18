import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/prisma";
import { getR2, getR2Bucket } from "./r2-client";
import { UPLOAD_CLEANUP_GRACE_MS } from "./upload-policy";

export async function deleteUnreferencedFile(key: string) {
  // Only manage the application's lesson-resource namespace.
  if (!key.startsWith("lesson-resources/")) return false;
  return db.$transaction(
    async (tx) => {
      // Completion uses the same object lock, so cleanup cannot delete a file
      // between its last database check and attaching it to a lesson.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      const encodedKey = key.split("/").map(encodeURIComponent).join("/");
      const referenced = await tx.resource.count({
        where: {
          OR: [
            { key },
            { url: key },
            { url: { endsWith: `/${key}` } },
            { url: { endsWith: `/${encodedKey}` } },
          ],
        },
      });
      if (referenced) return false;
      const allocation = await tx.uploadAllocation.findUnique({
        where: { key },
      });
      const cutoff = Date.now() - UPLOAD_CLEANUP_GRACE_MS;
      // Keep bytes charged beyond both the upload URL and save windows. Deleting a
      // fresh object would let its still-valid, single-write URL be reused.
      if (allocation && allocation.createdAt.getTime() >= cutoff) return false;
      if (allocation && !allocation.savedAt) {
        try {
          const object = await getR2().send(
            new HeadObjectCommand({ Bucket: getR2Bucket(), Key: key }),
            { abortSignal: AbortSignal.timeout(10000) },
          );
          if (!object.LastModified || object.LastModified.getTime() >= cutoff)
            return false;
        } catch (error) {
          if (
            (error as { $metadata?: { httpStatusCode?: number } }).$metadata
              ?.httpStatusCode !== 404
          )
            throw error;
        }
      }
      await getR2().send(
        new DeleteObjectCommand({
          Bucket: getR2Bucket(),
          Key: key,
        }),
        { abortSignal: AbortSignal.timeout(10000) },
      );
      // R2 deletion (including a confirmed absent object) must succeed first.
      await tx.uploadAllocation.deleteMany({ where: { key } });
      return true;
    },
    { timeout: 30000 },
  );
}

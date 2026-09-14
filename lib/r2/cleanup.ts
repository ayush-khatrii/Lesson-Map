import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/prisma";

export async function deleteUnreferencedFile(key: string) {
  // Only manage the application's lesson-resource namespace.
  if (!key.startsWith("lesson-resources/")) return false;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const referenced = await db.resource.count({
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
  const { r2 } = await import("./r2-client");
  await r2.send(
    new DeleteObjectCommand({
      Bucket: process.env.CF_R2_BUCKET_NAME || "lesson-map",
      Key: key,
    }),
  );
  return true;
}

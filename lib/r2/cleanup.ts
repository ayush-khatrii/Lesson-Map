import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/prisma";
import { getR2, getR2Bucket } from "./r2-client";

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
  await getR2().send(
    new DeleteObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
    }),
  );
  return true;
}

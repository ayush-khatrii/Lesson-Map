import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2, getR2Bucket } from "./r2-client";

export async function uploadFile(file: File, folder: string) {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const key = `${folder}/${file.name}`;

    await getR2().send(
      new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    );

    return key;
  } catch (error) {
    console.log("Error uploading file:", error);
  }
}

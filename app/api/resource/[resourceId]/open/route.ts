import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getR2,
  getR2Bucket,
  R2NotConfiguredError,
} from "@/lib/r2/r2-client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  try {
    const { resourceId } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session.userId;
    const resource = await db.resource.findFirst({
      where: {
        id: resourceId,
        lesson: { module: { course: { OR: [
          { isPublic: true },
          ...(userId ? [{ userId }] : []),
        ] } } },
      },
    });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    let url = resource.url;
    if (resource.key) {
      // Resolve older uploads that saved only an object key, and private buckets.
      url = await getSignedUrl(getR2(), new GetObjectCommand({
        Bucket: getR2Bucket(),
        Key: resource.key,
        ResponseContentDisposition: "inline",
      }), { expiresIn: 300 });
    }
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "No file URL is available for this resource" }, { status: 404 });
    }
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof R2NotConfiguredError) {
      console.error("Failed to open resource: R2 is not configured");
      return NextResponse.json(
        { error: "File storage is temporarily unavailable." },
        { status: 503 },
      );
    }
    console.error("Failed to open resource:", error);
    return NextResponse.json({ error: "Unable to open this resource. Please try again." }, { status: 500 });
  }
}

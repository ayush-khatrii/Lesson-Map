import { timingSafeEqual } from "node:crypto";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { deleteUnreferencedFile } from "@/lib/r2/cleanup";
import {
  getR2,
  getR2Bucket,
  R2NotConfiguredError,
} from "@/lib/r2/r2-client";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Cleanup is not configured" },
      { status: 503 },
    );
  }
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const r2 = getR2();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let cursor: string | undefined;
    let removed = 0;
    let failed = 0;
    do {
      const page = await r2.send(new ListObjectsV2Command({
        Bucket: getR2Bucket(),
        Prefix: "lesson-resources/",
        ContinuationToken: cursor,
        MaxKeys: 1000,
      }));
      for (const object of page.Contents || []) {
        if (
          !object.Key ||
          !object.LastModified ||
          object.LastModified.getTime() >= cutoff
        ) {
          continue;
        }
        try {
          if (await deleteUnreferencedFile(object.Key)) removed++;
        } catch (error) {
          failed++;
          console.error("Orphan cleanup failed:", error);
        }
      }
      cursor = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (cursor);
    return NextResponse.json(
      { removed, failed },
      {
        status: failed ? 500 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof R2NotConfiguredError) {
      console.error("Upload reconciliation skipped: R2 is not configured");
      return NextResponse.json(
        { error: "Cleanup is not configured" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Upload reconciliation failed:", error);
    return NextResponse.json(
      { error: "Cleanup failed; the next scheduled run will retry." },
      { status: 500 },
    );
  }
}

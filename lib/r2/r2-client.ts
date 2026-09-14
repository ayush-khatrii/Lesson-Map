import { S3Client } from "@aws-sdk/client-s3";

/**
 * Thrown when R2 credentials are missing. Callers should map this to a 503 so a
 * configuration gap degrades one feature instead of crashing the whole module.
 */
export class R2NotConfiguredError extends Error {
  constructor() {
    super("Cloudflare R2 credentials are not configured");
    this.name = "R2NotConfiguredError";
  }
}

export const DEFAULT_R2_BUCKET = "lesson-map";

let client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.CF_R2_URL &&
      process.env.CF_R2_ACCESS_KEY_ID &&
      process.env.CF_R2_SECRET_ACCESS_KEY,
  );
}

export function getR2Bucket(): string {
  return process.env.CF_R2_BUCKET_NAME || DEFAULT_R2_BUCKET;
}

/**
 * Resolves the R2 client on first use. Environment variables are read here, not
 * at module scope, so this file can be imported during builds and in
 * environments (previews, tests) where R2 is intentionally unconfigured.
 */
export function getR2(): S3Client {
  if (client) return client;

  const r2UrlEndpoint = process.env.CF_R2_URL;
  const r2AccessKeyId = process.env.CF_R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY;

  if (!r2UrlEndpoint || !r2AccessKeyId || !r2SecretAccessKey) {
    throw new R2NotConfiguredError();
  }

  client = new S3Client({
    region: "auto",
    endpoint: r2UrlEndpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });

  return client;
}

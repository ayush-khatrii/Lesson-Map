import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import * as OTPAuth from "otpauth";

function encryptionKey() {
  const key = process.env.ADMIN_TOTP_ENCRYPTION_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(key))
    throw new Error("Administrator encryption is not configured.");
  return Buffer.from(key, "hex");
}

export function encryptSecret(secret: string, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`lessonmap-admin:${userId}`));
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(value: string, userId: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data)
    throw new Error("Invalid encrypted secret.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAAD(Buffer.from(`lessonmap-admin:${userId}`));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function authenticator(secret: string, email = "") {
  return new OTPAuth.TOTP({
    issuer: "LessonMap Admin",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export function newAuthenticator(email: string) {
  const secret = new OTPAuth.Secret({ size: 20 }).base32;
  return { secret, uri: authenticator(secret, email).toString() };
}

export function acceptedCounter(
  secret: string,
  code: string,
  lastCounter: bigint | null,
  now = Date.now(),
) {
  const delta = authenticator(secret).validate({
    token: code.trim(),
    timestamp: now,
    window: 1,
  });
  if (delta === null) return null;
  const counter = BigInt(Math.floor(now / 30000) + delta);
  return lastCounter !== null && counter <= lastCounter ? null : counter;
}

export function hashRecoveryCode(code: string, accessId: string) {
  return createHash("sha256")
    .update(`${accessId}:${code.trim().toUpperCase()}`)
    .digest("hex");
}

export function newRecoveryCodes() {
  return Array.from({ length: 10 }, () =>
    randomBytes(16)
      .toString("hex")
      .toUpperCase()
      .match(/.{1,8}/g)!
      .join("-"),
  );
}

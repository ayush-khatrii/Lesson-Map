import "server-only";
import QRCode from "qrcode";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { AdminError, requireAdmin } from "./guard";
import { readJson, audit, throttle } from "./http";
import {
  acceptedCounter,
  encryptSecret,
  decryptSecret,
  newAuthenticator,
  newRecoveryCodes,
  hashRecoveryCode,
} from "./crypto";
import { verificationIsFresh } from "./policy";

type Admin = Awaited<ReturnType<typeof requireAdmin>>;

export async function securityStatus(admin: Admin) {
  return {
    enrolled: Boolean(admin.access.totpEnabledAt),
    role: admin.access.role,
    email: admin.user.email,
    fresh: verificationIsFresh(admin.session.verifiedAt),
  };
}

export async function securityAction(
  action: string,
  request: Request,
  admin: Admin,
) {
  if (action === "logout") {
    await db.adminSession.deleteMany({
      where: { id: admin.session.id, userId: admin.user.id },
    });
    await audit(admin.user.id, "ADMIN_SIGNED_OUT");
    return { ok: true };
  }
  if (action === "lock") {
    await db.adminSession.updateMany({
      where: { id: admin.session.id },
      data: { verifiedAt: null, verifiedVersion: null, lastActivityAt: null },
    });
    await audit(admin.user.id, "DASHBOARD_LOCKED");
    return { ok: true };
  }
  await throttle(`security:${admin.access.id}`, action === "enroll" ? 10 : 5);
  if (action === "enroll") {
    const enrollment = newAuthenticator(admin.user.email);
    const changed = await db.adminAccess.updateMany({
      where: { id: admin.access.id, active: true, totpEnabledAt: null },
      data: {
        pendingSecret: encryptSecret(enrollment.secret, admin.user.id),
        pendingExpiresAt: new Date(Date.now() + 10 * 60000),
      },
    });
    if (changed.count !== 1)
      throw new AdminError(
        403,
        "FORBIDDEN",
        "Authenticator setup is unavailable.",
      );
    await audit(admin.user.id, "AUTHENTICATOR_SETUP_STARTED");
    return {
      qrCode: await QRCode.toDataURL(enrollment.uri, { margin: 2, width: 240 }),
      secret: enrollment.secret,
    };
  }
  if (!["confirm", "verify", "recover", "rotate-recovery"].includes(action))
    throw new AdminError(404, "NOT_FOUND", "Unknown security action.");
  const body = z
    .object({
      code: z
        .string()
        .min(1, "Enter your code.")
        .max(256, "Unable to verify this code."),
    })
    .parse(await readJson(request));
  const recoveryCodes =
    action === "confirm" || action === "rotate-recovery"
      ? newRecoveryCodes()
      : [];

  const valid = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "AdminAccess" WHERE "id" = ${admin.access.id} FOR UPDATE`;
    const access = await tx.adminAccess.findUnique({
      where: { id: admin.access.id },
    });
    const session = await tx.adminSession.findUnique({
      where: { id: admin.session.id },
    });
    const now = new Date();
    if (!access?.active || !session || session.expiresAt <= now) return false;

    if (action === "recover") {
      if (!access.totpEnabledAt) return false;
      const consumed = await tx.adminRecoveryCode.updateMany({
        where: {
          accessId: access.id,
          hash: hashRecoveryCode(body.code, access.id),
          usedAt: null,
        },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) return false;
      await tx.adminAccess.update({
        where: { id: access.id },
        data: {
          totpSecret: null,
          totpEnabledAt: null,
          pendingSecret: null,
          pendingExpiresAt: null,
          lastCounter: null,
          securityVersion: { increment: 1 },
        },
      });
      await tx.adminRecoveryCode.deleteMany({
        where: { accessId: access.id, usedAt: null },
      });
      await tx.adminSession.deleteMany({ where: { userId: admin.user.id } });
      await tx.adminAuditLog.create({
        data: { actorUserId: admin.user.id, action: "AUTHENTICATOR_RECOVERED" },
      });
      return true;
    }

    const enrolling = action === "confirm";
    const encrypted = enrolling ? access.pendingSecret : access.totpSecret;
    if (
      !encrypted ||
      (enrolling &&
        (access.totpEnabledAt ||
          !access.pendingExpiresAt ||
          access.pendingExpiresAt <= now))
    )
      return false;
    const counter = acceptedCounter(
      decryptSecret(encrypted, admin.user.id),
      body.code,
      access.lastCounter,
      now.getTime(),
    );
    if (counter === null) return false;
    await tx.adminAccess.update({
      where: { id: access.id },
      data: {
        lastCounter: counter,
        ...(enrolling
          ? {
              totpSecret: encrypted,
              totpEnabledAt: now,
              pendingSecret: null,
              pendingExpiresAt: null,
            }
          : {}),
      },
    });
    if (recoveryCodes.length) {
      await tx.adminRecoveryCode.deleteMany({ where: { accessId: access.id } });
      await tx.adminRecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({
          accessId: access.id,
          hash: hashRecoveryCode(code, access.id),
        })),
      });
    }
    await tx.adminSession.update({
      where: { id: session.id },
      data: {
        verifiedAt: now,
        verifiedVersion: access.securityVersion,
        lastActivityAt: now,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        actorUserId: admin.user.id,
        action: enrolling
          ? "AUTHENTICATOR_ENROLLED"
          : action === "rotate-recovery"
            ? "RECOVERY_CODES_ROTATED"
            : "AUTHENTICATOR_VERIFIED",
      },
    });
    return true;
  });
  if (!valid) {
    await audit(admin.user.id, "VERIFICATION_FAILED");
    throw new AdminError(400, "INVALID_CODE", "Unable to verify this code.");
  }
  return {
    ok: true,
    ...(recoveryCodes.length ? { recoveryCodes } : {}),
    ...(action === "recover" ? { signInRequired: true } : {}),
  };
}

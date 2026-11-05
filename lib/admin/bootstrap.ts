import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../../app/generated/prisma/client";

export async function bootstrapAdmin(
  db: Pick<PrismaClient, "$transaction">,
  email: string,
  password?: string,
) {
  if (password !== undefined && (password.length < 12 || password.length > 128))
    throw new Error("Password must contain 12–128 characters.");
  const passwordHash =
    password === undefined ? undefined : await hashPassword(password);
  return db.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: {
        email: { equals: email.trim().toLowerCase(), mode: "insensitive" },
      },
      select: { id: true },
    });
    if (!user)
      throw new Error(
        "This email does not belong to an existing LessonMap user.",
      );
    const owner = await tx.adminAccess.findFirst({
      where: { role: "SUPER_ADMIN" },
      select: { userId: true },
    });
    if (owner && owner.userId !== user.id)
      throw new Error(
        "A different super admin already exists. No access was changed.",
      );
    // Serialize credential creation when two setup commands target this user.
    await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${user.id} FOR UPDATE`;
    await tx.adminAccess.upsert({
      where: { userId: user.id },
      create: { userId: user.id, role: "SUPER_ADMIN" },
      update: { role: "SUPER_ADMIN", active: true },
    });
    if (passwordHash !== undefined) {
      const updated = await tx.account.updateMany({
        where: { userId: user.id, providerId: "credential" },
        data: { password: passwordHash },
      });
      if (!updated.count)
        await tx.account.create({
          data: {
            id: randomUUID(),
            accountId: user.id,
            userId: user.id,
            providerId: "credential",
            password: passwordHash,
          },
        });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.adminSession.deleteMany({ where: { userId: user.id } });
      await tx.adminAuditLog.create({
        data: {
          actorUserId: user.id,
          action: "ADMIN_PASSWORD_SET",
          targetId: user.id,
        },
      });
    }
    if (!owner)
      await tx.adminAuditLog.create({
        data: {
          actorUserId: user.id,
          action: "SUPER_ADMIN_BOOTSTRAPPED",
          targetId: user.id,
        },
      });
    const accounts = await tx.account.findMany({
      where: { userId: user.id },
      select: { providerId: true, password: true },
    });
    return {
      hasPassword: accounts.some(
        (a) => a.providerId === "credential" && Boolean(a.password),
      ),
    };
  });
}

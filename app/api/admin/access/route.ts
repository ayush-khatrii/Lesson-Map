import { z } from "zod";
import { db } from "@/lib/prisma";
import { adminEndpoint, readJson, throttle } from "@/lib/admin/http";
import { AdminError } from "@/lib/admin/guard";

export const GET = adminEndpoint(async (_request, admin) => {
  const [members, logs] = await Promise.all([
    db.adminAccess.findMany({
      select: {
        id: true,
        userId: true,
        role: true,
        active: true,
        totpEnabledAt: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.adminAuditLog.findMany({
      select: {
        id: true,
        actorUserId: true,
        action: true,
        targetId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const ids = [
    ...new Set(
      logs.flatMap((log) => (log.actorUserId ? [log.actorUserId] : [])),
    ),
  ];
  const actors = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return {
    role: admin.access.role,
    currentUserId: admin.user.id,
    members: members.map(({ totpEnabledAt, user, ...m }) => ({
      ...m,
      name: user.name,
      email: user.email,
      enrolled: Boolean(totpEnabledAt),
    })),
    logs: logs.map(({ actorUserId, ...log }) => ({
      ...log,
      actor: actors.find((a) => a.id === actorUserId)?.name ?? "System",
    })),
  };
});

export const POST = adminEndpoint(
  async (request, admin) => {
    await throttle(`access:${admin.user.id}`, 10);
    const input = z
      .object({ email: z.string().trim().toLowerCase().pipe(z.email()) })
      .parse(await readJson(request));
    await db.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { email: { equals: input.email, mode: "insensitive" } },
        select: { id: true },
      });
      if (!user)
        throw new AdminError(
          404,
          "USER_NOT_FOUND",
          "This user must already have a LessonMap account.",
        );
      const existing = await tx.adminAccess.findUnique({
        where: { userId: user.id },
        select: { role: true, active: true },
      });
      if (existing?.role === "SUPER_ADMIN" || existing?.active)
        throw new AdminError(
          409,
          "ALREADY_ADMIN",
          "This user already has dashboard access.",
        );
      await tx.adminAccess.upsert({
        where: { userId: user.id },
        create: { userId: user.id, role: "ADMIN" },
        update: {
          active: true,
          securityVersion: { increment: 1 },
          pendingSecret: null,
          pendingExpiresAt: null,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actorUserId: admin.user.id,
          action: "ADMIN_ACCESS_GRANTED",
          targetId: user.id,
        },
      });
    });
    return { ok: true };
  },
  { superAdmin: true, fresh: true },
);

export const PATCH = adminEndpoint(
  async (request, admin) => {
    await throttle(`access:${admin.user.id}`, 10);
    const input = z
      .object({ userId: z.string().min(1), active: z.literal(false) })
      .parse(await readJson(request));
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "AdminAccess" WHERE "userId"=${input.userId} FOR UPDATE`;
      const target = await tx.adminAccess.findUnique({
        where: { userId: input.userId },
      });
      if (!target)
        throw new AdminError(404, "NOT_FOUND", "Administrator not found.");
      if (target.role === "SUPER_ADMIN" || input.userId === admin.user.id)
        throw new AdminError(
          403,
          "FORBIDDEN",
          "The super admin cannot be revoked here.",
        );
      await tx.adminAccess.update({
        where: { id: target.id },
        data: {
          active: false,
          securityVersion: { increment: 1 },
          pendingSecret: null,
          pendingExpiresAt: null,
        },
      });
      await tx.adminSession.deleteMany({ where: { userId: target.userId } });
      await tx.adminAuditLog.create({
        data: {
          actorUserId: admin.user.id,
          action: "ADMIN_ACCESS_REVOKED",
          targetId: target.userId,
        },
      });
    });
    return { ok: true };
  },
  { superAdmin: true, fresh: true },
);

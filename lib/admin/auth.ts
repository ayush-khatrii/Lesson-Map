import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/prisma";
import { adminAuthOptions } from "./auth-options";

function createAdminAuth() {
  return betterAuth({
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    secret: process.env.ADMIN_AUTH_SECRET,
    database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
    ...adminAuthOptions(
      async (userId) => {
        const access = await db.adminAccess.findUnique({
          where: { userId },
          select: { active: true },
        });
        return access?.active === true;
      },
      async (userId) => {
        await db.adminAuditLog.create({
          data: { actorUserId: userId, action: "ADMIN_AUTHENTICATED" },
        });
      },
    ),
  });
}

let instance: ReturnType<typeof createAdminAuth> | undefined;
export function getAdminAuth() {
  if (!process.env.ADMIN_AUTH_SECRET?.trim())
    throw new Error("Administrator access is not configured.");
  return (instance ??= createAdminAuth());
}

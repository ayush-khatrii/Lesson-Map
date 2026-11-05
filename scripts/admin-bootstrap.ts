import "dotenv/config";
import { db } from "../lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const email = args[args.indexOf("--email") + 1]?.trim().toLowerCase();
  if (!args.includes("--email") || !email || !email.includes("@"))
    throw new Error(
      "Usage: npm run admin:bootstrap -- --email existing-user@example.com",
    );
  await db.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
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
    await tx.adminAccess.upsert({
      where: { userId: user.id },
      create: { userId: user.id, role: "SUPER_ADMIN" },
      update: { role: "SUPER_ADMIN", active: true },
    });
    if (!owner)
      await tx.adminAuditLog.create({
        data: {
          actorUserId: user.id,
          action: "SUPER_ADMIN_BOOTSTRAPPED",
          targetId: user.id,
        },
      });
  });
  console.log(
    "Super-admin access is ready. Sign in at /dashboard/admin/login and enroll an authenticator.",
  );
}
main()
  .catch((error) => {
    const safe = ["Usage:", "This email", "A different super admin"];
    console.error(
      error instanceof Error &&
        safe.some((prefix) => error.message.startsWith(prefix))
        ? error.message
        : "Bootstrap failed. Check database access and apply the dashboard migration first.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

import type { Prisma } from "@/app/generated/prisma/client";

// Course creation paths share this short lock so concurrent requests cannot
// both claim the last Free course slot. Never hold it while calling DeepSeek.
export async function lockCourseOwner(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${userId} FOR UPDATE`;
  return tx.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      subscriptionStatus: true,
      subscriptionCancelAtPeriodEnd: true,
      subscriptionCurrentPeriodEnd: true,
    },
  });
}

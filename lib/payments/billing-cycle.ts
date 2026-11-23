import "server-only";
import { db } from "@/lib/prisma";
import { queueBillingEmail } from "./billing-email";
import { createDodoPayments } from "./dodopayments";
import { paymentCredentials, productIdForPlan } from "./config";

export async function processBillingCycles(now = new Date()) {
  const config = paymentCredentials();
  const environment = config.environment === "live_mode" ? "LIVE" : "TEST";
  const client = createDodoPayments(config.apiKey, config.environment);
  const reminderThrough = new Date(now);
  reminderThrough.setUTCHours(0, 0, 0, 0);
  reminderThrough.setUTCDate(reminderThrough.getUTCDate() + 4);
  let cursor: string | undefined;
  let processed = 0;
  let failures = 0;
  // Paginate so billing history is never loaded into memory all at once.
  do {
    const users = await db.user.findMany({
      where: {
        subscriptionId: { not: null },
        OR: [
          {
            paymentEnvironment: environment,
            plan: { not: "FREE" },
            subscriptionCurrentPeriodEnd: { not: null, lt: reminderThrough },
            subscriptionStatus: { in: ["active", "cancelled"] },
          },
          {
            plan: "FREE",
            subscriptionStatus: "cancelled",
            AND: [
              {
                OR: [
                  { paymentEnvironment: environment },
                  { paymentEnvironment: null },
                ],
              },
              {
                OR: [
                  { subscriptionCurrentPeriodEnd: { gt: now } },
                  { subscriptionCurrentPeriodEnd: null },
                ],
              },
            ],
          },
        ],
      },
      orderBy: { id: "asc" },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const snapshot of users) {
      try {
        let user = snapshot;
        // Repair legacy premature downgrades only after checking Dodo ownership.
        if (
          user.plan === "FREE" &&
          user.subscriptionStatus === "cancelled" &&
          (!user.subscriptionCurrentPeriodEnd ||
            user.subscriptionCurrentPeriodEnd > now)
        ) {
          const subscription = await client.subscriptions.retrieve(
            user.subscriptionId!,
            {},
            { timeout: 8000, maxRetries: 0 },
          );
          const plan =
            subscription.product_id === productIdForPlan("CREATOR")
              ? "CREATOR"
              : subscription.product_id === productIdForPlan("PROFESSIONAL")
                ? "PROFESSIONAL"
                : null;
          const providerEnd = new Date(subscription.next_billing_date);
          if (
            !plan ||
            !(
              subscription.metadata?.userId === user.id ||
              (user.customerId &&
                subscription.customer.customer_id === user.customerId)
            ) ||
            !(
              subscription.status === "cancelled" ||
              (subscription.status === "active" &&
                subscription.cancel_at_next_billing_date)
            ) ||
            !Number.isFinite(providerEnd.getTime()) ||
            providerEnd <= now
          )
            continue;
          // Neither a later provider date nor a replay may extend the stored paid boundary.
          const end = new Date(
            Math.min(
              providerEnd.getTime(),
              user.subscriptionCurrentPeriodEnd?.getTime() ??
                providerEnd.getTime(),
            ),
          );
          const changed = await db.user.updateMany({
            where: {
              id: user.id,
              plan: "FREE",
              subscriptionId: user.subscriptionId,
              subscriptionStatus: "cancelled",
              subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
            },
            data: {
              plan,
              paymentEnvironment: environment,
              subscriptionCancelAtPeriodEnd: true,
              subscriptionCurrentPeriodEnd: end,
            },
          });
          if (!changed.count) continue;
          user = {
            ...user,
            plan,
            subscriptionCancelAtPeriodEnd: true,
            subscriptionCurrentPeriodEnd: end,
          };
        }
        if (user.plan === "FREE") continue;
        const end = user.subscriptionCurrentPeriodEnd!;
        if (end >= reminderThrough) continue;
        const cancelled =
          user.subscriptionCancelAtPeriodEnd ||
          user.subscriptionStatus === "cancelled";
        if (!cancelled && end <= now) continue;
        const action =
          end <= now
            ? "PLAN_ACCESS_ENDED"
            : cancelled
              ? "PLAN_EXPIRY_REMINDER"
              : "PLAN_RENEWAL_REMINDER";
        const id = `${environment}:${user.subscriptionId}:${action}:${end.toISOString()}`;
        await db.$transaction(async (tx) => {
          // Serialize with webhook updates and recheck the snapshot before acting.
          await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${user.id} FOR UPDATE`;
          const current = await tx.user.findUnique({ where: { id: user.id } });
          if (
            !current ||
            current.plan === "FREE" ||
            current.subscriptionId !== user.subscriptionId ||
            current.subscriptionCurrentPeriodEnd?.getTime() !== end.getTime() ||
            current.subscriptionStatus !== user.subscriptionStatus ||
            current.subscriptionCancelAtPeriodEnd !==
              user.subscriptionCancelAtPeriodEnd
          )
            return;
          if (action === "PLAN_ACCESS_ENDED") {
            await tx.user.update({
              where: { id: user.id },
              data: {
                plan: "FREE",
                subscriptionStatus: "cancelled",
                subscriptionCancelAtPeriodEnd: true,
              },
            });
          }
          await queueBillingEmail(tx, {
            id,
            userId: user.id,
            subscriptionId: user.subscriptionId!,
            paymentEnvironment: environment,
            periodEnd: end,
            event: {
              action,
              eventId: id,
              to: user.email,
              name: user.name,
              periodEnd: end.toISOString(),
            },
          });
        });
        processed++;
      } catch {
        failures++;
        console.error("Billing cycle processing failed", {
          userId: snapshot.id,
        });
      }
    }
    cursor = users.length === 100 ? users[users.length - 1].id : undefined;
  } while (cursor);
  return { processed, failures };
}

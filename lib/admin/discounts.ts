import "server-only";
import type { Discount } from "dodopayments/resources/discounts";
import { adminDodo } from "./billing";
import { couponInput, couponState, financialTermsMatch } from "./coupon-policy";
import { AdminError } from "./guard";
import { audit, throttle } from "./http";
import type { DiscountRow } from "./contracts";

function present(
  discount: Discount,
  products: ReturnType<typeof adminDodo>["products"],
): DiscountRow {
  const row = {
    id: discount.discount_id,
    name: discount.name || discount.code,
    code: discount.code,
    percentage: discount.amount / 100,
    plans: products
      .filter((p) => discount.restricted_to.includes(p.id))
      .map((p) => p.plan),
    startsAt: discount.starts_at ?? null,
    expiresAt: discount.expires_at ?? null,
    timesUsed: discount.times_used,
    usageLimit: discount.usage_limit ?? null,
    perCustomerLimit: discount.per_customer_usage_limit ?? null,
    cycles: discount.subscription_cycles ?? null,
    eligibility:
      discount.customer_eligibility === "specific"
        ? ("any" as const)
        : discount.customer_eligibility,
    preserveOnPlanChange: discount.preserve_on_plan_change,
    editable:
      discount.type === "percentage" &&
      discount.customer_eligibility !== "specific",
  };
  return { ...row, state: couponState(row) };
}

function isScoped(
  discount: Discount,
  products: ReturnType<typeof adminDodo>["products"],
) {
  return (
    discount.restricted_to.length > 0 &&
    discount.restricted_to.every((id) => products.some((p) => p.id === id))
  );
}

export async function listDiscounts() {
  const { client, products } = adminDodo();
  const data: DiscountRow[] = [];
  for await (const discount of client.discounts.list(
    { page_size: 100 },
    { timeout: 10000, maxRetries: 2 },
  )) {
    if (isScoped(discount, products) && discount.type === "percentage")
      data.push(present(discount, products));
  }
  return {
    data: data.sort((a, b) => a.code.localeCompare(b.code)),
    plans: products.map((p) => p.plan),
    fetchedAt: new Date().toISOString(),
  };
}

export async function mutateDiscount(actor: string, raw: unknown, id?: string) {
  await throttle(`discount:${actor}`, 10);
  const { client, products } = adminDodo();
  const previous = id
    ? await client.discounts.retrieve(id, { timeout: 10000, maxRetries: 0 })
    : null;
  if (previous && !isScoped(previous, products))
    throw new AdminError(404, "NOT_FOUND", "Coupon not found.");
  if (
    previous &&
    raw &&
    typeof raw === "object" &&
    "action" in raw &&
    raw.action === "end"
  ) {
    const result = await client.discounts.update(
      previous.discount_id,
      {
        expires_at: new Date().toISOString(),
        ...(previous.starts_at &&
        new Date(previous.starts_at).getTime() > Date.now()
          ? { starts_at: null }
          : {}),
      },
      { timeout: 10000, maxRetries: 0 },
    );
    await audit(actor, "COUPON_ENDED", result.discount_id);
    return { data: present(result, products) };
  }
  const input = couponInput.parse(raw);
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now())
    throw new AdminError(400, "INVALID_EXPIRY", "Choose a future expiry date.");
  const targets = input.plans.map(
    (plan) => products.find((p) => p.plan === plan)?.id,
  );
  if (targets.some((id) => !id))
    throw new AdminError(
      503,
      "PLAN_NOT_CONFIGURED",
      "A selected plan is not configured in Dodo.",
    );
  if (
    previous?.times_used &&
    !financialTermsMatch(present(previous, products), input)
  )
    throw new AdminError(
      409,
      "COUPON_USED",
      "Create a replacement code to change redeemed coupon terms.",
    );
  if (
    previous &&
    (previous.type !== "percentage" ||
      previous.customer_eligibility === "specific")
  )
    throw new AdminError(
      409,
      "UNSUPPORTED_COUPON",
      "Manage this coupon in Dodo.",
    );
  if (previous && input.usageLimit && input.usageLimit < previous.times_used)
    throw new AdminError(
      400,
      "INVALID_LIMIT",
      "The limit cannot be below existing redemptions.",
    );
  const body = {
    type: "percentage" as const,
    amount: Math.round(input.percentage * 100),
    code: input.code,
    name: input.name,
    restricted_to: targets as string[],
    starts_at: input.startsAt,
    expires_at: input.expiresAt,
    usage_limit: input.usageLimit,
    per_customer_usage_limit: input.perCustomerLimit,
    subscription_cycles: input.cycles,
    customer_eligibility: input.eligibility,
    preserve_on_plan_change: input.preserveOnPlanChange,
    metadata: { app: "lessonmap" },
  };
  await audit(
    actor,
    previous ? "COUPON_UPDATE_REQUESTED" : "COUPON_CREATE_REQUESTED",
    previous?.discount_id,
    { code: input.code, percentage: input.percentage, plans: input.plans },
  );
  let result: Discount;
  if (previous) {
    result = await client.discounts.update(previous.discount_id, body, {
      timeout: 10000,
      maxRetries: 0,
    });
  } else {
    try {
      await client.discounts.retrieveByCode(input.code, {
        timeout: 10000,
        maxRetries: 0,
      });
      throw new AdminError(
        409,
        "DUPLICATE_CODE",
        "This code already exists. Refresh the list or choose another code.",
      );
    } catch (error) {
      if (!(
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 404
      ))
        throw error;
    }
    try {
      result = await client.discounts.create(body, {
        timeout: 10000,
        maxRetries: 0,
      });
    } catch (error) {
      // A timed-out write may have succeeded. Reconcile the exact code and terms.
      const reconciled = await client.discounts
        .retrieveByCode(input.code, { timeout: 10000, maxRetries: 0 })
        .catch(() => null);
      if (
        !reconciled ||
        !isScoped(reconciled, products) ||
        !financialTermsMatch(present(reconciled, products), input) ||
        reconciled.usage_limit !== input.usageLimit ||
        reconciled.per_customer_usage_limit !== input.perCustomerLimit ||
        (reconciled.expires_at
          ? new Date(reconciled.expires_at).getTime()
          : null) !==
          (input.expiresAt ? new Date(input.expiresAt).getTime() : null)
      )
        throw error;
      result = reconciled;
    }
  }
  await audit(
    actor,
    previous ? "COUPON_UPDATED" : "COUPON_CREATED",
    result.discount_id,
  );
  return { data: present(result, products) };
}

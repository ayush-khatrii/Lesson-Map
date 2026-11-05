import { z } from "zod";
export const couponInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(16)
      .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, hyphens or underscores."),
    percentage: z
      .number()
      .min(0.01)
      .max(100)
      .refine(
        (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001,
        "Use at most two decimal places.",
      ),
    plans: z
      .array(z.enum(["CREATOR", "PROFESSIONAL"]))
      .min(1)
      .max(2)
      .transform((v) => [...new Set(v)]),
    startsAt: z.iso.datetime({ offset: true }).nullable().default(null),
    expiresAt: z.iso.datetime({ offset: true }).nullable().default(null),
    usageLimit: z
      .number()
      .int()
      .positive()
      .max(2147483647)
      .nullable()
      .default(null),
    perCustomerLimit: z
      .number()
      .int()
      .positive()
      .max(2147483647)
      .nullable()
      .default(1),
    cycles: z.number().int().positive().max(2147483647).nullable().default(1),
    eligibility: z.enum(["any", "first_time", "existing"]).default("any"),
    preserveOnPlanChange: z.boolean().default(false),
  })
  .refine(
    (v) =>
      !v.startsAt ||
      !v.expiresAt ||
      new Date(v.startsAt) < new Date(v.expiresAt),
    "Expiry must follow the start date.",
  )
  .refine(
    (v) =>
      !v.usageLimit ||
      !v.perCustomerLimit ||
      v.perCustomerLimit <= v.usageLimit,
    "Per-customer limit cannot exceed the total limit.",
  );

export function couponState(
  coupon: {
    startsAt: string | null;
    expiresAt: string | null;
    usageLimit: number | null;
    timesUsed: number;
  },
  now = Date.now(),
) {
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= now)
    return "expired" as const;
  if (coupon.usageLimit !== null && coupon.timesUsed >= coupon.usageLimit)
    return "exhausted" as const;
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now)
    return "scheduled" as const;
  return "active" as const;
}

export function financialTermsMatch(
  previous: {
    percentage: number;
    plans: string[];
    cycles: number | null;
    preserveOnPlanChange: boolean;
    code: string;
    startsAt: string | null;
  },
  next: z.output<typeof couponInput>,
) {
  return (
    Math.round(previous.percentage * 100) ===
      Math.round(next.percentage * 100) &&
    [...previous.plans].sort().join(",") === [...next.plans].sort().join(",") &&
    previous.cycles === next.cycles &&
    previous.preserveOnPlanChange === next.preserveOnPlanChange &&
    previous.code === next.code &&
    (previous.startsAt ? new Date(previous.startsAt).getTime() : null) ===
      (next.startsAt ? new Date(next.startsAt).getTime() : null)
  );
}

// Public plan prices shared by page copy and search-engine structured data.
// Checkout and existing subscriptions use the configured Dodo Payments product.
export const PLAN_PRICING = {
  currency: "USD",
  currencySymbol: "$",
  billingPeriod: "month",
  plans: {
    FREE: { name: "Free", amount: 0 },
    CREATOR: { name: "Creator", amount: 15 },
  },
} as const;

export function formatPlanPrice(plan: keyof typeof PLAN_PRICING.plans) {
  return `${PLAN_PRICING.currencySymbol}${PLAN_PRICING.plans[plan].amount}`;
}

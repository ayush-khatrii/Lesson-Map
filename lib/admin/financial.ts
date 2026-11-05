import type { BillingDataset, FinancialPeriod } from "./contracts";
import {
  dateKey,
  chartDateKeys,
  monthlyChart,
  type ReportRange,
} from "./filters";

export function summarizeFinancials(
  dataset: BillingDataset,
  range: ReportRange,
) {
  function period(from: Date, to: Date): FinancialPeriod {
    const payments = dataset.payments.filter(
      (p) =>
        p.currency === range.currency &&
        new Date(p.createdAt) >= from &&
        new Date(p.createdAt) < to,
    );
    const succeeded = payments.filter((p) => p.status === "succeeded");
    const failed = payments.filter((p) => p.status === "failed").length;
    const gross = succeeded.reduce((sum, p) => sum + p.amount, 0);
    const refunds = dataset.refunds
      .filter(
        (r) =>
          r.currency === range.currency &&
          new Date(r.createdAt) >= from &&
          new Date(r.createdAt) < to,
      )
      .reduce((sum, r) => sum + r.amount, 0);
    const terminal = succeeded.length + failed;
    return {
      gross,
      refunds,
      net: gross - refunds,
      succeeded: succeeded.length,
      failed,
      successRate: terminal ? (succeeded.length / terminal) * 100 : 0,
      averagePayment: succeeded.length ? gross / succeeded.length : 0,
    };
  }
  const current = period(range.from, range.to);
  const previous = range.previousFrom
    ? period(range.previousFrom, range.from)
    : null;
  const inPeriod = (createdAt: string) =>
    new Date(createdAt) >= range.from && new Date(createdAt) < range.to;
  const points = new Map<
    string,
    { date: string; collected: number; refunded: number }
  >();
  const monthly = monthlyChart(range);
  const bucket = (date: string) =>
    monthly ? dateKey(date).slice(0, 7) : dateKey(date);
  const point = (date: string) => {
    const key = bucket(date);
    if (!points.has(key))
      points.set(key, { date: key, collected: 0, refunded: 0 });
    return points.get(key)!;
  };
  const currentPayments = dataset.payments.filter(
    (p) => p.currency === range.currency && inPeriod(p.createdAt),
  );
  for (const p of currentPayments)
    if (p.status === "succeeded") point(p.createdAt).collected += p.amount;
  for (const r of dataset.refunds)
    if (r.currency === range.currency && inPeriod(r.createdAt))
      point(r.createdAt).refunded += r.amount;
  return {
    current,
    previous,
    trend: chartDateKeys(range, [...points.keys()]).map(
      (date) => points.get(date) ?? { date, collected: 0, refunded: 0 },
    ),
    currencies: [
      ...new Set([
        range.currency,
        ...dataset.payments.map((p) => p.currency),
        ...dataset.refunds.map((r) => r.currency),
      ]),
    ].sort(),
    byPlan: ["CREATOR", "PROFESSIONAL"].map((plan) => ({
      name: plan === "CREATOR" ? "Creator" : "Professional",
      collected: currentPayments
        .filter((p) => p.plan === plan && p.status === "succeeded")
        .reduce((sum, p) => sum + p.amount, 0),
    })),
    payments: currentPayments.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
  };
}

export function minorUnitFactor(currency: string) {
  const digits =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  return 10 ** digits;
}

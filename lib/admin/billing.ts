import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/prisma";
import { paymentCredentials, productIdForPlan } from "@/lib/payments/config";
import { createDodoPayments } from "@/lib/payments/dodopayments";
import type { Prisma } from "@/app/generated/prisma/client";
import type { BillingDataset, BillingReport, PaymentRow } from "./contracts";
import {
  reportRange,
  tableQuery,
  queryValues,
  type ReportRange,
} from "./filters";
import { summarizeFinancials } from "./financial";

export function adminDodo() {
  const config = paymentCredentials();
  const products = (["CREATOR", "PROFESSIONAL"] as const).flatMap((plan) => {
    const id = productIdForPlan(plan);
    return id ? [{ plan, id }] : [];
  });
  if (!products.length) throw new Error("Billing products are not configured.");
  if (new Set(products.map((p) => p.id)).size !== products.length)
    throw new Error("Billing plan products must be distinct.");
  return {
    client: createDodoPayments(config.apiKey, config.environment),
    products,
    environment: config.environment,
  };
}

async function fetchDataset(range: ReportRange): Promise<BillingDataset> {
  const { client, products } = adminDodo();
  const from = (range.previousFrom ?? range.from).toISOString();
  const to = new Date(range.to.getTime() - 1).toISOString();
  const options = { timeout: 10000, maxRetries: 2 };
  const payments = new Map<string, PaymentRow>();
  // The SDK iterates every page. A failure rejects the dataset, never a partial total.
  for (const product of products) {
    for await (const payment of client.payments.list(
      {
        product_id: product.id,
        created_at_gte: from,
        created_at_lte: to,
        page_size: 100,
      },
      options,
    )) {
      const existing = payments.get(payment.payment_id);
      if (existing && existing.plan !== product.plan)
        throw new Error("A mixed-product payment cannot be allocated safely.");
      payments.set(payment.payment_id, {
        id: payment.payment_id,
        createdAt: payment.created_at,
        name: payment.customer.name,
        email: payment.customer.email,
        amount: payment.total_amount,
        currency: payment.currency,
        plan: product.plan,
        status: payment.status ?? "processing",
      });
    }
  }
  const dataset: BillingDataset = {
    payments: [...payments.values()],
    refunds: [],
  };
  const attribution = new Map<string, PaymentRow["plan"] | null>();
  for await (const refund of client.refunds.list(
    {
      status: "succeeded",
      created_at_gte: from,
      created_at_lte: to,
      page_size: 100,
    },
    options,
  )) {
    let plan =
      payments.get(refund.payment_id)?.plan ??
      attribution.get(refund.payment_id);
    if (plan === undefined) {
      const original = await client.payments.retrieve(
        refund.payment_id,
        options,
      );
      if (original.subscription_id) {
        const subscription = await client.subscriptions.retrieve(
          original.subscription_id,
          {},
          options,
        );
        plan =
          products.find((p) => p.id === subscription.product_id)?.plan ?? null;
      } else {
        const cart = original.product_cart ?? [];
        const matches = products.filter((p) =>
          cart.some((item) => item.product_id === p.id),
        );
        if (matches.length && (cart.length !== 1 || matches.length !== 1))
          throw new Error("A mixed-product refund cannot be allocated safely.");
        plan = matches[0]?.plan ?? null;
      }
      attribution.set(refund.payment_id, plan);
    }
    if (!plan) continue;
    if (refund.amount == null || !refund.currency)
      throw new Error("Refund amount or currency is unavailable.");
    dataset.refunds.push({
      id: refund.refund_id,
      createdAt: refund.created_at,
      amount: refund.amount,
      currency: refund.currency,
      plan,
    });
  }
  return dataset;
}

export async function billingReport(
  params: URLSearchParams,
): Promise<BillingReport> {
  const range = reportRange(params);
  const page = tableQuery.parse(queryValues(params));
  const empty: BillingReport = {
    available: false,
    stale: false,
    fetchedAt: null,
    currency: range.currency,
    currencies: [range.currency],
    current: null,
    previous: null,
    trend: [],
    byPlan: [],
    payments: { data: [], total: 0, page: page.page, pageSize: page.pageSize },
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
  };
  let cached: Awaited<ReturnType<typeof db.adminReportCache.findUnique>> = null;
  try {
    const { environment, products } = adminDodo();
    // Round relative windows to the minute so requests share complete cached reads.
    const key = `billing-v1:${createHash("sha256")
      .update(
        JSON.stringify([
          environment,
          products,
          Math.floor(range.from.getTime() / 60000),
          Math.floor(range.to.getTime() / 60000),
          range.period,
        ]),
      )
      .digest("hex")}`;
    cached = await db.adminReportCache.findUnique({ where: { key } });
    let dataset: BillingDataset;
    let fetchedAt: Date;
    let stale = false;
    if (
      cached &&
      Date.now() - cached.fetchedAt.getTime() < 60000 &&
      params.get("refresh") !== "true"
    ) {
      dataset = cached.data as unknown as BillingDataset;
      fetchedAt = cached.fetchedAt;
    } else {
      try {
        dataset = await fetchDataset(range);
        fetchedAt = new Date();
        await db.adminReportCache.upsert({
          where: { key },
          create: {
            key,
            data: dataset as unknown as Prisma.InputJsonValue,
            fetchedAt,
          },
          update: {
            data: dataset as unknown as Prisma.InputJsonValue,
            fetchedAt,
          },
        });
        // Keep cache storage bounded without deleting current results.
        await db.adminReportCache.deleteMany({
          where: { fetchedAt: { lt: new Date(Date.now() - 7 * 86400000) } },
        });
      } catch {
        if (!cached) throw new Error("Billing read unavailable.");
        dataset = cached.data as unknown as BillingDataset;
        fetchedAt = cached.fetchedAt;
        stale = true;
      }
    }
    const summary = summarizeFinancials(dataset, range);
    const search = (params.get("q") ?? "").toLowerCase();
    const rows = summary.payments.filter(
      (p) =>
        (!search || `${p.name} ${p.email}`.toLowerCase().includes(search)) &&
        (!params.get("status") ||
          params.get("status") === "all" ||
          p.status === params.get("status")) &&
        (!params.get("plan") ||
          params.get("plan") === "all" ||
          p.plan === params.get("plan")),
    );
    return {
      ...empty,
      ...summary,
      available: true,
      stale,
      fetchedAt: fetchedAt.toISOString(),
      ...(stale
        ? { error: "Dodo is unavailable. Showing the last complete result." }
        : {}),
      payments: {
        data: rows.slice(
          (page.page - 1) * page.pageSize,
          page.page * page.pageSize,
        ),
        total: rows.length,
        page: page.page,
        pageSize: page.pageSize,
      },
    };
  } catch {
    return {
      ...empty,
      error:
        "Dodo reporting is unavailable. Check billing configuration and try again.",
    };
  }
}

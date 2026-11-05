"use client";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageHeading,
  ReportToolbar,
  LoadingState,
  ErrorState,
  Metric,
  Panel,
  Pager,
  TableFrame,
  Empty,
  displayDate,
  money,
  useAdminReport,
  useAdminParams,
  selectClass,
} from "./Shared";
import { RevenueChart } from "./Charts";
import type { BillingReport } from "@/lib/admin/contracts";

export function RevenueView() {
  const query = useAdminReport<BillingReport>("revenue"),
    data = query.data,
    { params, set } = useAdminParams(),
    [search, setSearch] = useState(params.get("q") ?? "");
  function searchSubmit(e: FormEvent) {
    e.preventDefault();
    set({ q: search });
  }
  return (
    <>
      <PageHeading
        title="Revenue"
        description="Collections and payment performance, directly from Dodo."
      />
      <ReportToolbar
        currencies={data?.currencies}
        fetching={query.isFetching}
        onRefresh={() => void query.refresh().catch(() => {})}
      />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        data && (
          <>
            {data.error && (
              <div
                role="status"
                className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-400"
              >
                {data.error}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Gross collections"
                value={
                  data.current ? money(data.current.gross, data.currency) : "—"
                }
                current={data.current?.gross}
                previous={data.previous?.gross}
                detail="Successful payments, including tax"
              />
              <Metric
                label="Refunded"
                value={
                  data.current
                    ? money(data.current.refunds, data.currency)
                    : "—"
                }
                detail="Successful refunds in this period"
              />
              <Metric
                label="Net collections"
                value={
                  data.current ? money(data.current.net, data.currency) : "—"
                }
                current={data.current?.net}
                previous={data.previous?.net}
                detail="Gross less refunds · before fees"
              />
              <Metric
                label="Average payment"
                value={
                  data.current
                    ? money(data.current.averagePayment, data.currency)
                    : "—"
                }
                detail={
                  data.current
                    ? `${data.current.succeeded} successful · ${data.current.successRate.toFixed(1)}% success`
                    : "Reporting unavailable"
                }
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Panel
                  title="Collections over time"
                  description={`${data.currency} · Financial amounts include tax`}
                >
                  <RevenueChart data={data.trend} currency={data.currency} />
                </Panel>
              </div>
              <Panel
                title="Collections by plan"
                description="Successful payments in this period"
              >
                <div className="space-y-6 p-4">
                  {data.byPlan.map((plan, i) => {
                    const total = data.current?.gross ?? 0;
                    return (
                      <div key={plan.name}>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {plan.name}
                          </span>
                          <span className="font-medium tabular-nums">
                            {money(plan.collected, data.currency)}
                          </span>
                        </div>
                        <div className="h-2 rounded-sm bg-muted">
                          <div
                            className={`h-2 rounded-sm ${i ? "bg-chart-2" : "bg-chart-1"}`}
                            style={{
                              width: `${total ? (plan.collected / total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Net collections are payments less refunds, including tax.
                    Fees and business expenses are not deducted.
                  </p>
                  {data.fetchedAt && (
                    <p className="text-[10px] text-muted-foreground">
                      Updated {displayDate(data.fetchedAt)}
                      {data.stale ? " · Last complete result" : ""}
                    </p>
                  )}
                </div>
              </Panel>
            </div>
            <Panel
              title="Payments"
              description="Search customers and filter the selected reporting period"
            >
              <div className="flex flex-wrap gap-2 border-b p-3">
                <form
                  onSubmit={searchSubmit}
                  className="flex items-center gap-2"
                >
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      aria-label="Search payment customers"
                      placeholder="Search name or email…"
                      className="w-60 pl-8 text-xs"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Button size="sm" variant="outline">
                    Search
                  </Button>
                </form>
                <select
                  aria-label="Payment status"
                  className={selectClass}
                  value={params.get("status") ?? "all"}
                  onChange={(e) => set({ status: e.target.value })}
                >
                  <option value="all">All statuses</option>
                  {["succeeded", "failed", "processing", "cancelled"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
                <select
                  aria-label="Payment plan"
                  className={selectClass}
                  value={params.get("plan") ?? "all"}
                  onChange={(e) => set({ plan: e.target.value })}
                >
                  <option value="all">Both plans</option>
                  <option value="CREATOR">Creator</option>
                  <option value="PROFESSIONAL">Professional</option>
                </select>
              </div>
              {data.payments.data.length ? (
                <TableFrame>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.data.map((p) => (
                      <tr key={p.id}>
                        <td className="text-muted-foreground">
                          {displayDate(p.createdAt)}
                        </td>
                        <td>
                          <p className="font-medium">{p.name}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {p.email}
                          </p>
                        </td>
                        <td>
                          {p.plan === "CREATOR" ? "Creator" : "Professional"}
                        </td>
                        <td>
                          <Badge
                            variant={
                              p.status === "succeeded" ? "secondary" : "outline"
                            }
                            className={`text-[10px] ${p.status === "failed" ? "text-destructive" : ""}`}
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="text-right font-medium tabular-nums">
                          {money(p.amount, p.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableFrame>
              ) : (
                <Empty
                  message={
                    data.available
                      ? undefined
                      : "Payments are unavailable until Dodo reporting reconnects."
                  }
                />
              )}
              <Pager {...data.payments} />
            </Panel>
          </>
        )
      )}
    </>
  );
}

"use client";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  Layers,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageHeading,
  ReportToolbar,
  LoadingState,
  ErrorState,
  Metric,
  Panel,
  integer,
  money,
  useAdminReport,
} from "./Shared";
import { PlanChart, RevenueChart, SignupChart } from "./Charts";
import type { OverviewReport } from "@/lib/admin/contracts";

export function BusinessOverview() {
  const query = useAdminReport<OverviewReport>("overview"),
    data = query.data,
    billing = data?.billing;
  return (
    <>
      <PageHeading
        title="Business overview"
        description="A clear view of growth, subscriptions, and course creation."
      />
      <ReportToolbar
        currencies={billing?.currencies}
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
            {billing?.error && (
              <div
                role="status"
                className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-400"
              >
                {billing.error}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Net collections"
                value={
                  billing?.current
                    ? money(billing.current.net, billing.currency)
                    : "—"
                }
                current={billing?.current?.net}
                previous={billing?.previous?.net}
                detail="vs previous period"
                icon={<CircleDollarSign />}
              />
              <Metric
                label="Gross collections"
                value={
                  billing?.current
                    ? money(billing.current.gross, billing.currency)
                    : "—"
                }
                current={billing?.current?.gross}
                previous={billing?.previous?.gross}
                detail="Includes tax, before refunds"
                icon={<CircleDollarSign />}
              />
              <Metric
                label="Active paid users"
                value={integer(data.totals.paid)}
                detail={`${data.totals.users ? ((data.totals.paid / data.totals.users) * 100).toFixed(1) : 0}% of current users`}
                icon={<Users />}
              />
              <Metric
                label="New registrations"
                value={integer(data.signups.current)}
                current={data.signups.current}
                previous={data.signups.previous}
                detail="in selected period"
                icon={<UserPlus />}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Registered users"
                value={integer(data.totals.users)}
                detail="Current accounts"
                icon={<Users />}
              />
              <Metric
                label="Total courses"
                value={integer(data.totals.courses)}
                detail="Current course inventory"
                icon={<GraduationCap />}
              />
              <Metric
                label="Total modules"
                value={integer(data.totals.modules)}
                detail="Across all courses"
                icon={<Layers />}
              />
              <Metric
                label="Total lessons"
                value={integer(data.totals.lessons)}
                detail="Across all modules"
                icon={<BookOpen />}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Panel
                  title="Collections over time"
                  description="Successful payments and refunds in the selected currency"
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px]"
                      asChild
                    >
                      <Link href="/dashboard/admin/revenue">
                        View revenue
                        <ChevronRight className="size-3" />
                      </Link>
                    </Button>
                  }
                >
                  {billing?.available ? (
                    <RevenueChart
                      data={billing.trend}
                      currency={billing.currency}
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                      Financial reporting is unavailable.
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-4 border-t px-4 py-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-chart-1" />
                      Collected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-chart-3" />
                      Refunded
                    </span>
                    {billing?.fetchedAt && (
                      <span className="ml-auto">
                        Updated{" "}
                        {new Intl.DateTimeFormat("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(billing.fetchedAt))}
                        {billing.stale ? " · cached" : ""}
                      </span>
                    )}
                  </div>
                </Panel>
              </div>
              <Panel
                title="Users by plan"
                description="Current effective subscription plans"
              >
                <PlanChart
                  free={data.totals.free}
                  creator={data.totals.creator}
                  professional={data.totals.professional}
                />
              </Panel>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Panel
                  title="New user registrations"
                  description="New accounts created in the selected period"
                >
                  <SignupChart data={data.signups.trend} />
                </Panel>
              </div>
              <Panel
                title="Business health"
                description="Signals that help prioritize your next action"
              >
                <dl className="divide-y px-4">
                  <div className="flex items-center justify-between py-3 text-xs">
                    <dt className="text-muted-foreground">
                      Users with courses
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {integer(data.totals.withCourses)}{" "}
                      <span className="font-normal text-muted-foreground">
                        / {integer(data.totals.users)}
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3 text-xs">
                    <dt className="text-muted-foreground">
                      Scheduled cancellations · current
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {integer(data.totals.cancelling)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3 text-xs">
                    <dt className="text-muted-foreground">
                      Failed payments · period
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {billing?.current ? integer(billing.current.failed) : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3 text-xs">
                    <dt className="text-muted-foreground">
                      Payment success · period
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {billing?.current
                        ? `${billing.current.successRate.toFixed(1)}%`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3 text-xs">
                    <dt className="text-muted-foreground">Refunds · period</dt>
                    <dd className="font-medium tabular-nums">
                      {billing?.current
                        ? money(billing.current.refunds, billing.currency)
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </Panel>
            </div>
          </>
        )
      )}
    </>
  );
}

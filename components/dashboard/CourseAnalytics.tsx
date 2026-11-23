"use client";
import { useState } from "react";
import { Eye, Play, Mail, MousePointerClick, RefreshCw } from "lucide-react";
import { CourseAnalyticsDataSkeleton } from "@/components/dashboard/CourseAnalyticsSkeleton";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  METRICS,
  type AnalyticsData,
  type AnalyticsRange,
  type Metric,
} from "@/lib/course-analytics";

const metricIcons = {
  visits: Eye,
  starts: Play,
  signups: Mail,
  clicks: MousePointerClick,
};

const config = {
  visits: { label: "Visits", color: "#3b82f6" },
  starts: { label: "Learning starts", color: "#10b981" },
  signups: { label: "Email signups", color: "#f59e0b" },
  clicks: { label: "Paid-course clicks", color: "#a855f7" },
} satisfies ChartConfig;
export default function CourseAnalytics({ courseId }: { courseId: string }) {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [visible, setVisible] = useState<Metric[]>([...METRICS]);
  const { data, error, isPending, refetch, isFetching } =
    useQuery<AnalyticsData>({
      queryKey: ["course-analytics", courseId, range],
      queryFn: async ({ signal }) => {
        const response = await fetch(
          `/api/course/${encodeURIComponent(courseId)}/analytics?range=${range}`,
          { signal, cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Could not load analytics.");
        return result;
      },
      retry: false,
    });
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en", {
      timeZone: "UTC",
      month: "short",
      ...(data?.interval.granularity === "month"
        ? { year: "numeric" as const }
        : { day: "numeric" as const }),
    }).format(new Date(value));
  return (
    <div className="space-y-6" aria-busy={isFetching}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">Visitor activity · UTC</p>
        <div className="flex items-center gap-2">
          <Select
            value={range}
            onValueChange={(value) => setRange(value as AnalyticsRange)}
          >
            <SelectTrigger
              aria-label="Analytics date range"
              className="w-full sm:w-40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw
              aria-hidden="true"
              className={
                isFetching ? "size-4 motion-safe:animate-spin" : "size-4"
              }
            />
            Refresh
          </Button>
        </div>
      </div>
      {isPending ? (
        <CourseAnalyticsDataSkeleton />
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-xl border p-6">
          <h2 className="font-semibold">Unable to load analytics</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={() => void refetch()}>Try again</Button>
        </div>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {METRICS.map((metric) => {
                const Icon = metricIcons[metric];
                return (
                  <Card key={metric} className="gap-4 bg-card py-5">
                    <CardHeader className="flex min-h-10 flex-row items-center justify-between gap-3 px-5">
                      <CardTitle className="text-sm font-medium leading-5 text-muted-foreground">
                        {config[metric].label}
                      </CardTitle>
                      <span className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-muted sm:flex">
                        <Icon
                          aria-hidden="true"
                          className="size-4 text-muted-foreground"
                        />
                      </span>
                    </CardHeader>
                    <CardContent className="px-5">
                      <p className="text-3xl font-semibold tracking-tight tabular-nums">
                        {data.totals[metric].toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Card className="gap-5 bg-card">
              <CardHeader className="gap-3 px-4 sm:px-6">
                <CardTitle>Curriculum performance</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDate(data.interval.from)} –{" "}
                  {formatDate(
                    new Date(
                      new Date(data.interval.to).getTime() - 86400000,
                    ).toISOString(),
                  )}{" "}
                  ·{" "}
                  {data.interval.granularity === "month" ? "Monthly" : "Daily"}{" "}
                  activity
                </p>
              </CardHeader>
              <CardContent className="space-y-6 px-4 sm:px-6">
                <div className="flex flex-wrap gap-2" aria-label="Chart series">
                  {METRICS.map((metric) => (
                    <Button
                      key={metric}
                      variant={
                        visible.includes(metric) ? "secondary" : "outline"
                      }
                      size="sm"
                      aria-pressed={visible.includes(metric)}
                      onClick={() =>
                        setVisible((current) =>
                          current.includes(metric)
                            ? current.filter((item) => item !== metric)
                            : [...current, metric],
                        )
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full"
                        style={{ backgroundColor: config[metric].color }}
                      />
                      {config[metric].label}
                    </Button>
                  ))}
                </div>
                {METRICS.every((metric) => data.totals[metric] === 0) && (
                  <p className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm leading-6 text-muted-foreground">
                    No recorded activity in this period. Share your public
                    curriculum to start reaching learners.
                  </p>
                )}
                {visible.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">
                    Select a metric to show its activity.
                  </p>
                ) : (
                  <ChartContainer
                    config={config}
                    className="h-[280px] w-full sm:h-[340px]"
                  >
                    <LineChart
                      accessibilityLayer
                      data={data.buckets}
                      margin={{ left: 0, right: 12, top: 12 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={35}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) =>
                              formatDate(String(value))
                            }
                          />
                        }
                      />
                      <ChartLegend
                        content={
                          <ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />
                        }
                      />
                      {visible.map((metric) => (
                        <Line
                          key={metric}
                          dataKey={metric}
                          type="linear"
                          stroke={`var(--color-${metric})`}
                          strokeWidth={2}
                          dot={data.buckets.length === 1}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                )}
                <p className="sr-only">
                  Recorded activity:{" "}
                  {METRICS.map(
                    (metric) =>
                      `${config[metric].label}: ${data.totals[metric]}`,
                  ).join(". ")}
                  .
                </p>
              </CardContent>
            </Card>
          </>
        )
      )}
      {data && !error && (
        <details className="rounded-xl border border-border bg-muted/10 px-5 py-4">
          <summary className="cursor-pointer text-sm font-medium focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
            How metrics are counted
          </summary>
          <div className="mt-3 max-w-3xl space-y-2 text-sm leading-6 text-muted-foreground">
            <p>
              Visits, learning starts, and paid-course clicks are counted once
              per visitor session per course. Owner activity is excluded. Email
              signups count distinct submitted addresses.
            </p>
            <p>
              These numbers reflect recorded activity, not verified unique
              people or purchases. Click history starts when paid-course click
              tracking is enabled. Older clicks cannot be recovered.
            </p>
          </div>
        </details>
      )}
    </div>
  );
}

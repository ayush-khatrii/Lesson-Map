"use client";
import { useState } from "react";
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Visitor activity · UTC</p>
        <div className="flex gap-2">
          <Select
            value={range}
            onValueChange={(value) => setRange(value as AnalyticsRange)}
          >
            <SelectTrigger aria-label="Analytics date range" className="w-40">
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
            Refresh
          </Button>
        </div>
      </div>
      {isPending ? (
        <p role="status">Loading analytics…</p>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-xl border p-6">
          <p>{error.message}</p>
          <Button onClick={() => void refetch()}>Try again</Button>
        </div>
      ) : (
        data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {METRICS.map((metric) => (
                <Card key={metric}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {config[metric].label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tabular-nums">
                      {data.totals[metric].toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
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
              <CardContent className="space-y-5">
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
                      {config[metric].label}
                    </Button>
                  ))}
                </div>
                {METRICS.every((metric) => data.totals[metric] === 0) && (
                  <p className="text-sm text-muted-foreground">
                    No recorded activity in this period. Share your public
                    curriculum to start reaching learners.
                  </p>
                )}
                {visible.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">
                    Select a metric to show its activity.
                  </p>
                ) : (
                  <ChartContainer config={config} className="h-[320px] w-full">
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
                      <ChartLegend content={<ChartLegendContent />} />
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
      <p className="text-sm leading-relaxed text-muted-foreground">
        Visits, learning starts, and paid-course clicks are counted once per
        visitor session per course. Owner activity is excluded. Email signups
        count distinct submitted addresses. These numbers reflect recorded
        activity, not verified unique people or purchases. Click history starts
        when paid-course click tracking is enabled; older clicks cannot be
        recovered.
      </p>
    </div>
  );
}

"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Empty, money } from "./Shared";
import { minorUnitFactor } from "@/lib/admin/financial";
const grid = "var(--border)";
const tooltipStyle = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
};

export function RevenueChart({
  data,
  currency,
}: {
  data: { date: string; collected: number; refunded: number }[];
  currency: string;
}) {
  if (!data.length) return <Empty message="No payments in this period." />;
  return (
    <div className="h-64 p-3 sm:p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          accessibilityLayer
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => String(v).slice(5)}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            width={48}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              new Intl.NumberFormat("en", { notation: "compact" }).format(
                Number(v) / minorUnitFactor(currency),
              )
            }
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => money(Number(v), currency)}
            cursor={{ fill: "var(--muted)" }}
          />
          <Bar
            dataKey="collected"
            name="Collected"
            fill="var(--chart-1)"
            radius={[3, 3, 0, 0]}
            maxBarSize={30}
          />
          <Bar
            dataKey="refunded"
            name="Refunded"
            fill="var(--chart-3)"
            radius={[3, 3, 0, 0]}
            maxBarSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function SignupChart({
  data,
}: {
  data: { date: string; users: number }[];
}) {
  if (!data.length)
    return <Empty message="No new registrations in this period." />;
  return (
    <div className="h-52 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          accessibilityLayer
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => String(v).slice(5)}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            width={30}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="users"
            name="New users"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={data.length < 12}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function PlanChart({
  free,
  creator,
  professional,
}: {
  free: number;
  creator: number;
  professional: number;
}) {
  const data = [
    { name: "Free", value: free, color: "var(--muted-foreground)" },
    { name: "Creator", value: creator, color: "var(--chart-1)" },
    { name: "Professional", value: professional, color: "var(--chart-2)" },
  ];
  const total = free + creator + professional;
  return (
    <div className="p-4">
      {total ? (
        <div className="relative h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                stroke="var(--card)"
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums">
              {total.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground">
              total users
            </span>
          </div>
        </div>
      ) : (
        <Empty message="No users yet." />
      )}
      <div className="mt-2 space-y-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 rounded-sm"
              style={{ background: d.color }}
            />
            <span className="flex-1 text-muted-foreground">{d.name}</span>
            <span className="font-medium tabular-nums">
              {d.value.toLocaleString()}
            </span>
            <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
              {total ? ((d.value / total) * 100).toFixed(1) : "0"}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

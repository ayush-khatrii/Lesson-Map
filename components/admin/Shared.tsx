"use client";
import { useRef, useState, type ReactNode, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { adminReportOptions } from "@/lib/admin/report-options";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminFetch, AdminClientError } from "@/lib/admin/client";
import { minorUnitFactor } from "@/lib/admin/financial";
import { percentageChange, dateKey } from "@/lib/admin/filters";

export const selectClass =
  "h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50";
export function useAdminParams() {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  function set(values: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (
        value === undefined ||
        value === "" ||
        (value === "all" && key !== "period")
      )
        next.delete(key);
      else next.set(key, value);
    }
    if (resetPage && !("page" in values)) next.delete("page");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }
  return {
    params,
    set,
    reset: () => router.replace(pathname, { scroll: false }),
  };
}
export function useAdminReport<T>(resource: string, search?: string) {
  const { params } = useAdminParams();
  const client = useQueryClient();
  const options = adminReportOptions<T>(resource, search ?? params.toString());
  const query = useQuery({
    ...options,
    placeholderData: ["users", "content", "revenue"].includes(resource)
      ? keepPreviousData
      : undefined,
  });
  return {
    ...query,
    refresh: () =>
      client.fetchQuery({
        ...options,
        queryFn: ({ signal }) =>
          adminFetch<T>(
            `/api/admin/${resource}?${options.queryKey[2]}&refresh=true`,
            { signal },
          ),
        staleTime: 0,
      }),
  };
}
export function money(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / minorUnitFactor(currency));
}
export function integer(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
export function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
export function Panel({
  title,
  description,
  children,
  action,
  borderless = false,
  busy = false,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  borderless?: boolean;
  busy?: boolean;
}) {
  return (
    <Card
      aria-busy={busy}
      className={`gap-0 overflow-hidden rounded-lg py-0 shadow-none ${borderless ? "border-0" : ""}`}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}
export function Metric({
  label,
  value,
  detail,
  previous,
  current,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  previous?: number | null;
  current?: number;
  icon?: ReactNode;
}) {
  const change =
    previous != null && current !== undefined
      ? percentageChange(current, previous)
      : null;
  return (
    <Card className="gap-0 rounded-lg p-4 shadow-none">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <div className="mt-2 flex min-h-4 flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {change !== null && (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${typeof change === "number" && change < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}
          >
            {typeof change === "number" && change < 0 ? (
              <ArrowDown className="size-3" />
            ) : (
              <ArrowUpRight className="size-3" />
            )}
            {change === "new" ? "New" : `${change > 0 ? "+" : ""}${change}%`}
          </span>
        )}
        {detail}
      </div>
    </Card>
  );
}
export function Bool({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${value ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
    >
      {value ? <Check className="size-3.5" /> : <X className="size-3" />}
      {value ? "Yes" : "No"}
    </span>
  );
}
export function LoadingState() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((v) => (
          <div
            key={v}
            className="h-28 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg border bg-muted/30" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <Panel>
      <div role="alert" className="flex flex-wrap items-center gap-3 p-5">
        <TriangleAlert className="size-5 text-destructive" />
        <div className="flex-1">
          <p className="text-sm font-medium">Unable to load this view</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={retry}>
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      </div>
    </Panel>
  );
}
export function Empty({
  message = "No results match these filters.",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-44 items-center justify-center p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
export function Pager({
  total,
  page,
  pageSize,
  disabled = false,
}: {
  total: number;
  page: number;
  pageSize: number;
  disabled?: boolean;
}) {
  const { set } = useAdminParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
      <span>
        {integer(total)} results · Page {page} of {pages}
      </span>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="admin-page-size">
          Rows per page
        </label>
        <select
          id="admin-page-size"
          className={`${selectClass} h-8`}
          value={pageSize}
          disabled={disabled}
          onChange={(e) => set({ pageSize: e.target.value })}
        >
          {[25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} rows
            </option>
          ))}
        </select>
        <Button
          size="icon"
          variant="outline"
          className="size-8"
          disabled={disabled || page <= 1}
          aria-label="Previous page"
          onClick={() => set({ page: String(page - 1) }, false)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="size-8"
          disabled={disabled || page >= pages}
          aria-label="Next page"
          onClick={() => set({ page: String(page + 1) }, false)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
export function ReportToolbar({
  currencies = ["USD"],
  fetching = false,
  onRefresh,
}: {
  currencies?: string[];
  fetching?: boolean;
  onRefresh: () => void;
}) {
  const { params, set } = useAdminParams();
  const period = params.get("period") ?? "30d";
  function dates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    set({
      period: "custom",
      from: String(data.get("from")),
      to: String(data.get("to")),
    });
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="report-period">
          Reporting period
        </label>
        <select
          id="report-period"
          className={selectClass}
          value={period}
          onChange={(e) =>
            set(
              e.target.value === "custom"
                ? {
                    period: "custom",
                    from: dateKey(Date.now() - 30 * 86400000),
                    to: dateKey(Date.now()),
                  }
                : { period: e.target.value, from: undefined, to: undefined },
            )
          }
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
          <option value="custom">Custom dates</option>
        </select>
        <label className="sr-only" htmlFor="report-currency">
          Currency
        </label>
        <select
          id="report-currency"
          className={selectClass}
          value={params.get("currency") ?? "USD"}
          onChange={(e) => set({ currency: e.target.value })}
        >
          {[
            ...new Set(["USD", ...currencies, params.get("currency") ?? "USD"]),
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {period === "custom" && (
          <form onSubmit={dates} className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              name="from"
              aria-label="Start date"
              required
              className="w-36 text-xs"
              defaultValue={params.get("from") ?? ""}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              name="to"
              aria-label="End date"
              required
              className="w-36 text-xs"
              defaultValue={params.get("to") ?? ""}
            />
            <Button size="sm" variant="secondary">
              Apply
            </Button>
          </form>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          Asia/Kolkata · Compared with prior period
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={fetching}
        >
          <RefreshCw className={`size-3.5 ${fetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
export function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs [&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-3 [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:whitespace-nowrap [&_td]:px-4 [&_td]:py-3 [&_tbody_tr]:border-t [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/40">
        {children}
      </table>
    </div>
  );
}

export function useFreshAction() {
  const [open, setOpen] = useState(false),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef<null | (() => Promise<unknown>)>(null);
  async function run(action: () => Promise<unknown>) {
    try {
      return await action();
    } catch (e) {
      if (e instanceof AdminClientError && e.code === "REAUTH_REQUIRED") {
        pending.current = action;
        setError("");
        setCode("");
        setOpen(true);
        return;
      }
      throw e;
    }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminFetch("/api/admin/security/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setOpen(false);
      await pending.current?.();
      pending.current = null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }
  const dialog = (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          if (!value) pending.current = null;
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Verify to continue
          </DialogTitle>
          <DialogDescription>
            Enter the current code from your authenticator app.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={verify} className="space-y-4">
          <Label htmlFor="fresh-code">Authenticator code</Label>
          <Input
            id="fresh-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}Verify
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
  return { run, dialog };
}

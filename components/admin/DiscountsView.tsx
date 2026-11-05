"use client";
import { useState, type FormEvent } from "react";
import {
  Copy,
  Loader2,
  Pencil,
  Plus,
  Search,
  Shuffle,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminFetch } from "@/lib/admin/client";
import type { DiscountRow } from "@/lib/admin/contracts";
import {
  PageHeading,
  Panel,
  Metric,
  TableFrame,
  Empty,
  ErrorState,
  LoadingState,
  displayDate,
  useAdminReport,
  useFreshAction,
  selectClass,
} from "./Shared";

function generatedCode() {
  return `LM${Array.from(crypto.getRandomValues(new Uint8Array(5)), (n) =>
    n.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase()}`;
}
function localDate(value: string | null) {
  return value
    ? new Date(new Date(value).getTime() + 330 * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
}
function isoDate(value: FormDataEntryValue | null) {
  return value ? new Date(`${value}:00+05:30`).toISOString() : null;
}
export function DiscountsView() {
  const query = useAdminReport<{ data: DiscountRow[]; plans: string[] }>(
      "discounts",
    ),
    fresh = useFreshAction();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<DiscountRow | null>(null),
    [end, setEnd] = useState<DiscountRow | null>(null),
    [code, setCode] = useState(""),
    [duration, setDuration] = useState("first"),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [state, setState] = useState("all"),
    [target, setTarget] = useState("all");
  const coupons = query.data?.data ?? [],
    plans = query.data?.plans ?? [],
    locked = Boolean(editing?.timesUsed);
  const filtered = coupons.filter(
    (c) =>
      `${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase()) &&
      (state === "all" || c.state === state) &&
      (target === "all" || c.plans.includes(target)),
  );
  function edit(coupon: DiscountRow | null) {
    setEditing(coupon);
    setCode(coupon?.code ?? generatedCode());
    setDuration(
      coupon?.cycles === null
        ? "ongoing"
        : coupon?.cycles && coupon.cycles !== 1
          ? "custom"
          : "first",
    );
    setError("");
    setOpen(true);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    let payload: unknown;
    try {
      payload = {
        name: String(form.get("name")),
        code: locked ? editing!.code : code,
        percentage: locked
          ? editing!.percentage
          : Number(form.get("percentage")),
        plans: locked ? editing!.plans : form.getAll("plans"),
        startsAt: locked ? editing!.startsAt : isoDate(form.get("startsAt")),
        expiresAt: isoDate(form.get("expiresAt")),
        usageLimit: form.get("usageLimit")
          ? Number(form.get("usageLimit"))
          : null,
        perCustomerLimit: form.get("perCustomerLimit")
          ? Number(form.get("perCustomerLimit"))
          : null,
        cycles: locked
          ? editing!.cycles
          : duration === "ongoing"
            ? null
            : duration === "first"
              ? 1
              : Number(form.get("cycles")),
        eligibility: String(form.get("eligibility")),
        preserveOnPlanChange: locked
          ? editing!.preserveOnPlanChange
          : form.get("preserveOnPlanChange") === "on",
      };
    } catch {
      setError("Check the coupon dates.");
      return;
    }
    try {
      await fresh.run(async () => {
        setSaving(true);
        try {
          await adminFetch(
            editing
              ? `/api/admin/discounts/${encodeURIComponent(editing.id)}`
              : "/api/admin/discounts",
            {
              method: editing ? "PATCH" : "POST",
              body: JSON.stringify(payload),
            },
          );
          setOpen(false);
          await query.refetch();
        } finally {
          setSaving(false);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save coupon.");
    }
  }
  async function endCoupon() {
    if (!end) return;
    const coupon = end;
    setError("");
    try {
      await fresh.run(async () => {
        setSaving(true);
        try {
          await adminFetch(
            `/api/admin/discounts/${encodeURIComponent(coupon.id)}`,
            { method: "PATCH", body: JSON.stringify({ action: "end" }) },
          );
          setEnd(null);
          await query.refetch();
        } finally {
          setSaving(false);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to end coupon.");
    }
  }
  return (
    <>
      <PageHeading
        title="Discounts"
        description="Create targeted offers and keep promotional spending under control."
      >
        <Button size="sm" onClick={() => edit(null)} disabled={!query.data}>
          <Plus className="size-3.5" />
          Create coupon
        </Button>
      </PageHeading>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Total coupons"
              value={coupons.length}
              detail="Creator and Professional offers"
              icon={<Tag />}
            />
            <Metric
              label="Active now"
              value={coupons.filter((c) => c.state === "active").length}
              detail="Available for redemption"
            />
            <Metric
              label="Total redemptions"
              value={coupons.reduce((n, c) => n + c.timesUsed, 0)}
              detail="Reported by Dodo"
            />
            <Metric
              label="Scheduled"
              value={coupons.filter((c) => c.state === "scheduled").length}
              detail="Upcoming promotions"
            />
          </div>
          <Panel
            title="Coupon library"
            description="Percentage discounts for your paid subscription plans"
          >
            <div className="flex flex-wrap items-center gap-2 border-b p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  aria-label="Search coupons"
                  placeholder="Search code or name…"
                  className="w-60 pl-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className={selectClass}
                aria-label="Coupon status"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="all">All statuses</option>
                {["active", "scheduled", "expired", "exhausted"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                aria-label="Coupon target plan"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="all">All plans</option>
                <option value="CREATOR">Creator</option>
                <option value="PROFESSIONAL">Professional</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => void query.refresh().catch(() => {})}
              >
                Refresh
              </Button>
            </div>
            {filtered.length ? (
              <TableFrame>
                <thead>
                  <tr>
                    <th>Coupon</th>
                    <th>Discount</th>
                    <th>Plans</th>
                    <th>Redemptions</th>
                    <th>Duration</th>
                    <th>Validity</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <p className="font-medium">{c.name}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <code className="text-[11px] text-muted-foreground">
                            {c.code}
                          </code>
                          <Button
                            aria-label={`Copy ${c.code}`}
                            size="icon"
                            variant="ghost"
                            className="size-5"
                            onClick={() =>
                              void navigator.clipboard
                                .writeText(c.code)
                                .catch(() => {})
                            }
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="font-medium tabular-nums">
                        {c.percentage}%
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {c.plans.map((p) => (
                            <Badge
                              key={p}
                              variant="outline"
                              className="text-[10px] font-normal"
                            >
                              {p === "CREATOR" ? "Creator" : "Professional"}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="tabular-nums">
                        {c.timesUsed}
                        <span className="text-muted-foreground">
                          {" "}
                          / {c.usageLimit ?? "Unlimited"}
                        </span>
                      </td>
                      <td className="text-muted-foreground">
                        {c.cycles === null
                          ? "Ongoing"
                          : c.cycles === 1
                            ? "First payment"
                            : `${c.cycles} cycles`}
                      </td>
                      <td className="text-muted-foreground">
                        <p>
                          {c.expiresAt
                            ? `Until ${displayDate(c.expiresAt)}`
                            : "No expiry"}
                        </p>
                        {c.startsAt && (
                          <p className="mt-1 text-[10px]">
                            From {displayDate(c.startsAt)}
                          </p>
                        )}
                      </td>
                      <td>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-normal ${c.state === "active" ? "border-emerald-600/25 bg-emerald-600/5 text-emerald-600 dark:text-emerald-400" : c.state === "scheduled" ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {c.state}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label={`Edit ${c.code}`}
                            disabled={!c.editable}
                            onClick={() => edit(c)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          {(c.state === "active" ||
                            c.state === "scheduled") && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive"
                              aria-label={`End ${c.code}`}
                              onClick={() => {
                                setEnd(c);
                                setError("");
                              }}
                            >
                              <X className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableFrame>
            ) : (
              <Empty
                message={
                  coupons.length
                    ? undefined
                    : "No coupons yet. Create your first targeted offer."
                }
              />
            )}
          </Panel>
        </>
      )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!saving) setOpen(v);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit coupon" : "Create coupon"}
            </DialogTitle>
            <DialogDescription>
              Discount a paid plan. Dates and times use Asia/Kolkata.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-name">Offer name</Label>
                <Input
                  id="coupon-name"
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Launch offer"
                  defaultValue={editing?.name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Coupon code</Label>
                <div className="flex gap-1">
                  <Input
                    id="coupon-code"
                    required
                    minLength={3}
                    maxLength={16}
                    disabled={locked}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={locked}
                    aria-label="Generate coupon code"
                    onClick={() => setCode(generatedCode())}
                  >
                    <Shuffle className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-percentage">Percentage off</Label>
                <Input
                  id="coupon-percentage"
                  name="percentage"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  required
                  disabled={locked}
                  defaultValue={editing?.percentage ?? 20}
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Eligible plans</legend>
                <div className="flex min-h-9 items-center gap-4">
                  {plans.map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        name="plans"
                        value={p}
                        disabled={locked}
                        defaultChecked={
                          editing ? editing.plans.includes(p) : true
                        }
                        className="accent-primary"
                      />
                      {p === "CREATOR" ? "Creator" : "Professional"}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            {locked && (
              <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                This coupon has been redeemed. Create a replacement code to
                change its discount, plans, or billing duration.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-start">Starts at · optional</Label>
                <Input
                  id="coupon-start"
                  name="startsAt"
                  type="datetime-local"
                  disabled={locked}
                  defaultValue={localDate(editing?.startsAt ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-expiry">Expires at · optional</Label>
                <Input
                  id="coupon-expiry"
                  name="expiresAt"
                  type="datetime-local"
                  defaultValue={localDate(editing?.expiresAt ?? null)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-limit">Total redemption limit</Label>
                <Input
                  id="coupon-limit"
                  name="usageLimit"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  defaultValue={editing?.usageLimit ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-customer-limit">
                  Redemptions per customer
                </Label>
                <Input
                  id="coupon-customer-limit"
                  name="perCustomerLimit"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  defaultValue={editing ? (editing.perCustomerLimit ?? "") : 1}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-duration">Discount duration</Label>
                <select
                  id="coupon-duration"
                  name="duration"
                  className={`${selectClass} w-full`}
                  disabled={locked}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="first">First payment</option>
                  <option value="custom">Specific billing cycles</option>
                  <option value="ongoing">Ongoing</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-eligibility">Customer eligibility</Label>
                <select
                  id="coupon-eligibility"
                  name="eligibility"
                  className={`${selectClass} w-full`}
                  defaultValue={editing?.eligibility ?? "any"}
                >
                  <option value="any">Any customer</option>
                  <option value="first_time">First-time customers</option>
                  <option value="existing">Existing customers</option>
                </select>
              </div>
            </div>
            {duration === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="coupon-cycles">Number of billing cycles</Label>
                <Input
                  id="coupon-cycles"
                  name="cycles"
                  type="number"
                  min="1"
                  required
                  disabled={locked}
                  defaultValue={editing?.cycles ?? 3}
                />
              </div>
            )}
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                name="preserveOnPlanChange"
                className="mt-0.5 accent-primary"
                disabled={locked}
                defaultChecked={editing?.preserveOnPlanChange ?? false}
              />
              <span>Keep the discount if the customer changes plans</span>
            </label>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Save changes" : "Create coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(end)}
        onOpenChange={(v) => {
          if (!v && !saving) setEnd(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>End {end?.code}?</DialogTitle>
            <DialogDescription>
              This expires the coupon immediately. Existing subscription billing
              is managed by Dodo.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEnd(null)}
              disabled={saving}
            >
              Keep coupon
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => void endCoupon()}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}End coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {fresh.dialog}
    </>
  );
}

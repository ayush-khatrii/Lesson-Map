"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_LIMITS } from "@/lib/ai/schema";
import { COURSE_LIMITS } from "@/lib/plans";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

type PlanName = "FREE" | "CREATOR" | "PROFESSIONAL";

const PLAN_META: Record<PlanName, { name: string; price: string; period: string }> = {
  FREE: { name: "Free", price: "$0", period: "forever" },
  CREATOR: { name: "Creator", price: "$12", period: "per month" },
  PROFESSIONAL: { name: "Professional", price: "Custom", period: "per month" },
};

function statusMeta(status: string | null, isPaid: boolean) {
  const neutral = { label: "Free plan", className: "" };
  if (!status) return isPaid
    ? {
        label: "Active",
        className: "border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      }
    : neutral;

  switch (status) {
    case "on_hold":
      return {
        label: "Payment on hold",
        className: "border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      };
    case "failed":
      return {
        label: "Payment failed",
        className: "border border-destructive/25 bg-destructive/10 text-destructive",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "border border-border bg-muted/40 text-muted-foreground",
      };
    case "expired":
      return {
        label: "Expired",
        className: "border border-border bg-muted/40 text-muted-foreground",
      };
    case "pending":
      return {
        label: "Payment pending",
        className: "border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      };
    default:
      return isPaid
        ? {
            label: "Active",
            className: "border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          }
        : neutral;
  }
}

export default function BillingTab({
  plan,
  canManageBilling,
  subscriptionStatus,
  renewsOn,
  cancelsAtPeriodEnd,
}: {
  plan: PlanName;
  canManageBilling: boolean;
  subscriptionStatus: string | null;
  /** Formatted current-period-end date, or null when there is none. */
  renewsOn: string | null;
  cancelsAtPeriodEnd: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const isPaid = plan !== "FREE";
  const meta = PLAN_META[plan] ?? PLAN_META.FREE;
  const status = statusMeta(subscriptionStatus, isPaid);

  const entitlements = [
    { label: `${COURSE_LIMITS[plan]} course maps`, included: true },
    {
      label:
        AI_LIMITS[plan].modules === null
          ? `${AI_LIMITS[plan].monthlyAttempts} AI attempts / month — full course outlines`
          : `${AI_LIMITS[plan].monthlyAttempts} AI attempts / month — ${AI_LIMITS[plan].modules} module, ${AI_LIMITS[plan].lessonsPerModule} lesson`,
      included: true,
    },
    { label: "Unlimited modules and lessons you add yourself", included: true },
    { label: "Public share links without LessonMap branding", included: isPaid },
    { label: "Markdown export of your course outline", included: isPaid },
  ];

  async function handleManageBilling() {
    setOpening(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      if (!response.ok) throw new Error("portal-unavailable");
      const { url } = (await response.json()) as { url?: string };
      if (!url) throw new Error("portal-unavailable");
      window.location.href = url;
    } catch {
      toast.error("We could not open the billing portal. Please try again.");
      setOpening(false);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <CreditCard className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">{meta.name} plan</h2>
                <Badge variant="secondary" className={status.className}>
                  {status.label}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="text-lg font-semibold tracking-tight text-foreground">
                  {meta.price}
                </span>{" "}
                {meta.period}
              </p>
              {renewsOn && isPaid && (
                <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0" />
                  {cancelsAtPeriodEnd
                    ? `Access ends ${renewsOn}`
                    : `Renews on ${renewsOn}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            {canManageBilling ? (
              <Button
                onClick={handleManageBilling}
                disabled={opening}
                variant="outline"
                className="h-10 rounded-xl border-border bg-background px-4 shadow-sm"
              >
                {opening ? "Opening…" : "Manage billing"}
                <ArrowUpRight className="size-4" />
              </Button>
            ) : (
              <Button className="h-10 rounded-xl px-4" asChild>
                <Link href="/pricing">
                  Compare plans <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {isPaid && cancelsAtPeriodEnd && renewsOn && (
          <div className="flex items-start gap-3 border-t border-border/70 bg-amber-500/5 px-6 py-4 sm:px-8">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-5 text-muted-foreground">
              Your subscription is set to cancel. You keep every paid feature until{" "}
              <span className="font-medium text-foreground">{renewsOn}</span>, and you will not be
              charged again.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">What your plan includes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Limits apply to your account as a whole and reset as described below.
          </p>
        </div>
        <ul className="space-y-3">
          {entitlements.map((entitlement) => (
            <li key={entitlement.label} className="flex items-start gap-3 text-sm">
              {entitlement.included ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              ) : (
                <LockKeyhole className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
              )}
              <span className={entitlement.included ? "text-foreground" : "text-muted-foreground"}>
                {entitlement.label}
                {!entitlement.included && <span className="ml-2 text-xs">Paid plans only</span>}
              </span>
            </li>
          ))}
        </ul>
        {!isPaid && (
          <Button className="mt-6 w-full rounded-xl sm:w-auto" asChild>
            <Link href="/pricing">
              Upgrade your plan <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        )}
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <ReceiptText className="size-4" />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">Invoices &amp; payment method</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Payments are handled by Dodo Payments as merchant of record, so your card details never
            reach LessonMap. Use the billing portal to update your card, download invoices, or cancel
            your subscription.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canManageBilling ? (
            <Button
              onClick={handleManageBilling}
              disabled={opening}
              variant="outline"
              className="h-10 rounded-xl border-border bg-background px-4 shadow-sm"
            >
              {opening ? "Opening…" : "Open billing portal"}
              <ArrowUpRight className="size-4" />
            </Button>
          ) : (
            <Button variant="outline" disabled className="h-10 rounded-xl border-border bg-background px-4 shadow-sm">
              No billing history yet
            </Button>
          )}
          <Link
            href="/refund"
            className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Refund Policy <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-5 text-muted-foreground">
            Cancelling keeps your paid features until the end of the period you already paid for.
            Renewal payments are charged automatically until you cancel.
          </p>
        </div>
      </section>
    </>
  );
}

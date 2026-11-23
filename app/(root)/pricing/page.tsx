"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { comparisonRows, plans } from "@/constants";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useSubscriptionPlan } from "@/lib/flow/useSubscriptionPlan";
import { FaSpinner } from "react-icons/fa";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const PricingPage = () => {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const {
    data: session,
    isPending: isSessionPending,
    error: sessionError,
    refetch: refetchSession,
  } = useSession();
  const subscription = useSubscriptionPlan(session?.user.id);
  const currentPlan = subscription.plan;
  const isCheckingPlan = isSessionPending || subscription.isLoading;
  const hasStatusError = Boolean(sessionError) || subscription.isError;
  const [openingBilling, setOpeningBilling] = useState(false);
  const actionInProgress = useRef(false);
  const isBusy = loadingPlan !== null || openingBilling;

  const handleManageBilling = async () => {
    if (actionInProgress.current || isCheckingPlan || hasStatusError) return;
    actionInProgress.current = true;
    setOpeningBilling(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      if (response.status === 401) {
        router.push("/sign-in?callbackUrl=%2Fpricing");
        return;
      }
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") {
        throw new Error("Could not open billing management");
      }
      window.location.assign(data.url);
    } catch {
      toast.error("Could not open billing management. Please try again.");
    } finally {
      actionInProgress.current = false;
      setOpeningBilling(false);
    }
  };

  const handlePurchase = async (plan: string) => {
    if (actionInProgress.current || isCheckingPlan || hasStatusError) return;

    if (plan === "FREE") {
      router.push("/start");
      return;
    }

    actionInProgress.current = true;
    setLoadingPlan(plan);
    try {
      // Recheck before checkout in case access changed since the page loaded.
      const status = await fetch("/api/subscription/status", {
        cache: "no-store",
      });
      if (status.status === 401) {
        router.push("/sign-in?callbackUrl=%2Fpricing");
        return;
      }
      if (!status.ok) throw new Error("Could not load subscription");
      const latestSubscription = (await status.json()) as { plan: string };
      if (
        !["FREE", "CREATOR", "PROFESSIONAL"].includes(latestSubscription?.plan)
      ) {
        throw new Error("Invalid subscription status");
      }
      if (latestSubscription.plan !== "FREE") {
        void subscription.refetch();
        toast.info("You already have an active paid subscription.");
        return;
      }
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push("/sign-in?callbackUrl=%2Fpricing");
      } else if (response.ok && typeof data.checkoutUrl === "string") {
        window.location.href = data.checkoutUrl;
      } else {
        if (response.status === 409) void subscription.refetch();
        toast.error(data.error || "Failed to create checkout session.", {
          description:
            process.env.NODE_ENV !== "production" ? data.detail : undefined,
        });
      }
    } catch {
      toast.error("Could not connect to checkout. Please try again.");
    } finally {
      actionInProgress.current = false;
      setLoadingPlan(null);
    }
  };
  return (
    <section className="pb-16 pt-28 sm:pb-20 sm:pt-32">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-xl text-center sm:mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Try and share. Then grow your audience.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Start with one complete AI outline, free. Upgrade to Creator for
            ongoing AI assistance, exports, email capture, and unbranded
            sharing.
          </p>
        </div>

        {hasStatusError && !isCheckingPlan && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm"
          >
            <p>
              We couldn’t verify your current plan. Please retry before choosing
              a plan.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={subscription.isFetching}
              onClick={() => {
                if (sessionError) void refetchSession();
                else void subscription.refetch();
              }}
            >
              {subscription.isFetching ? "Retrying…" : "Retry"}
            </Button>
          </div>
        )}
        {currentPlan === "PROFESSIONAL" && (
          <p role="status" className="mb-6 text-sm text-muted-foreground">
            You have an active paid subscription. Use Manage billing to manage
            it.
          </p>
        )}

        <div className="grid rounded-xl border border-border bg-card md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrentPlan = Boolean(currentPlan === plan.type);
            const hasPaidPlan = Boolean(currentPlan && currentPlan !== "FREE");
            const managesBilling = hasPaidPlan && plan.type !== "FREE";
            const buttonLabel = isCheckingPlan
              ? "Checking your plan…"
              : hasStatusError
                ? "Plan unavailable"
                : managesBilling
                  ? openingBilling
                    ? "Opening billing…"
                    : "Manage billing"
                  : isCurrentPlan
                    ? "Current plan"
                    : hasPaidPlan && plan.type === "FREE"
                      ? "Included in your plan"
                      : loadingPlan === plan.type
                        ? "Opening checkout…"
                        : plan.cta;

            return (
              <article
                key={plan.type}
                aria-label={plan.name}
                className={cn(
                  "relative flex min-w-0 flex-col p-6 sm:p-8",
                  plan.isPopular
                    ? "rounded-b-xl border-t border-border bg-muted/30 md:-my-1 md:-me-px md:rounded-xl md:border md:py-9"
                    : "rounded-t-xl md:rounded-s-xl md:rounded-tr-none",
                )}
              >
                <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold tracking-tight">
                    {plan.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-normal",
                        plan.isPopular
                          ? "border-primary/20 bg-primary/10 text-primary-text"
                          : "text-muted-foreground",
                      )}
                    >
                      {plan.accent}
                    </Badge>
                    {isCurrentPlan && (
                      <Badge
                        variant="secondary"
                        className="rounded-md text-xs font-normal"
                      >
                        Current plan
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">
                  {plan.description}
                </p>
                <div className="mb-6 mt-8 flex items-baseline gap-1.5">
                  <span className="text-4xl font-medium tracking-tight sm:text-5xl">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <Button
                  onClick={() =>
                    managesBilling
                      ? handleManageBilling()
                      : handlePurchase(plan.type)
                  }
                  variant={plan.isPopular ? "default" : "outline"}
                  className="h-10 w-full rounded-lg text-sm font-medium"
                  aria-current={isCurrentPlan ? "true" : undefined}
                  disabled={
                    isCheckingPlan ||
                    hasStatusError ||
                    (isCurrentPlan && plan.type === "FREE") ||
                    (hasPaidPlan && plan.type === "FREE") ||
                    isBusy
                  }
                >
                  {(isCheckingPlan ||
                    loadingPlan === plan.type ||
                    (managesBilling && openingBilling)) && (
                    <FaSpinner
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  )}
                  {buttonLabel}
                </Button>

                <div className="mt-7 flex-1 border-t border-border pt-6">
                  <p className="mb-5 text-xs text-muted-foreground">
                    {plan.isPopular
                      ? "For publishing and growing your audience:"
                      : "Start creating with:"}
                  </p>
                  <ul className="space-y-3.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm leading-5"
                      >
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary-text">
                          <Check
                            aria-hidden="true"
                            className="size-2.5"
                            strokeWidth={2.5}
                          />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>

        <section
          className="mt-12 sm:mt-16"
          aria-labelledby="comparison-heading"
        >
          <div className="mb-5">
            <h2
              id="comparison-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Compare plans
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Find the right fit for your creator workflow.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[560px] table-fixed">
              <caption className="sr-only">
                LessonMap Free and Creator plan feature comparison
              </caption>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-10 w-[28%] px-4">Feature</TableHead>
                  <TableHead className="h-10 w-[36%] px-4">Free Plan</TableHead>
                  <TableHead className="h-10 w-[36%] bg-primary/5 px-4 text-primary-text">
                    Creator Plan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="px-4 py-2.5 align-top font-medium whitespace-normal">
                      {row.label}
                    </TableCell>
                    <TableCell className="px-4 py-2.5 align-top whitespace-normal text-muted-foreground">
                      {row.free}
                    </TableCell>
                    <TableCell className="bg-primary/[0.025] px-4 py-2.5 align-top whitespace-normal text-muted-foreground">
                      {row.creator}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 space-y-2 text-xs leading-5 text-muted-foreground">
            <p>
              Storage includes saved files and pending uploads. Space from
              deleted or unfinished uploads is released after cleanup, following
              a minimum 24-hour safety window.
            </p>
            <p>
              YouTube imports support playlists with up to 500 videos. Rate
              limits apply. Each imported playlist counts toward your plan’s
              course limit.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
};

export default PricingPage;

"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { comparisonRows, plans } from "@/constants";
import { cn } from "@/lib/utils";
import { Check, Sparkles, Workflow, ShieldCheck, Layers3 } from "lucide-react";
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
    <section className="relative pb-10 pt-24">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="mx-auto mb-6 max-w-xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
            A plan for your next course
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Start with one complete AI outline, free. Upgrade to Creator for ongoing AI assistance, Markdown &amp;
            PDF export, social links, and unbranded sharing.
          </p>
        </div>

        {hasStatusError && !isCheckingPlan && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm"
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
          <p role="status" className="mb-4 text-sm text-muted-foreground">
            You have an active paid subscription. Use Manage billing to manage it.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan, index) => {
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
              <Card
                key={index}
                className={cn(
                  "relative flex h-full flex-col gap-4 rounded-2xl border bg-transparent py-5",
                  plan.isPopular ? "border-primary" : "border-border",
                )}
              >
                <CardHeader className="gap-3 px-5 py-0">
                  <div>
                    <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
                      <h2 className="text-xl font-semibold tracking-tight">
                        {plan.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={plan.isPopular ? "default" : "outline"}
                          className="rounded-full px-2.5 py-0.5 text-[11px]"
                        >
                          {plan.accent}
                        </Badge>
                        {isCurrentPlan && (
                          <Badge
                            variant="secondary"
                            className="rounded-full px-2.5 py-0.5 text-[11px]"
                          >
                            Current plan
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-semibold tracking-tight">
                      {plan.price}
                    </span>
                    <span className="mb-1 text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 px-5">
                  <ul className="space-y-2 border-t border-border pt-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-primary">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className="leading-5 text-muted-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="px-5 pt-0">
                  <Button
                    onClick={() =>
                      managesBilling
                        ? handleManageBilling()
                        : handlePurchase(plan.type)
                    }
                    size="lg"
                    className={cn(
                      "h-10 w-full rounded-lg text-sm font-medium",
                      !plan.isPopular &&
                        "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
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
                      <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {buttonLabel}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-transparent p-5">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Feature comparison
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                What’s included vs. what’s not
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This comparison makes it clear which plan fits your creator
                workflow best.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Included
              <span className="text-border">|</span>
              <Sparkles className="h-4 w-4 text-violet-500" /> Creator-focused
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/70 bg-background/80">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Layers3 className="h-3.5 w-3.5" />
                      </span>
                      Feature
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </span>
                      Free Plan
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                      Creator Plan
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-t border-border/70 align-top"
                  >
                    <td className="px-4 py-4 text-foreground">{row.label}</td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.free}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {row.creator}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Workflow className="h-4 w-4 text-primary" /> Free plan
              </div>
              <p className="text-sm text-muted-foreground">
                Best for testing the idea, creating a few public maps, and
                sharing a simple course outline with your audience.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-violet-500" /> Creator plan
              </div>
              <p className="text-sm text-muted-foreground">
                Best for creators who want full multi-module AI generation, Flow maps,
                social and website links, and one-click
                Markdown &amp; PDF export.
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default PricingPage;

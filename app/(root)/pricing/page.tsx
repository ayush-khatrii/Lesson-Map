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
import { Check, Sparkles, Workflow, ShieldCheck, Layers3, BrainCircuit, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

const PricingPage = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isPlanPending, setIsPlanPending] = useState(false);
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();

  useEffect(() => {
    if (isSessionPending) return;
    if (!session?.user) {
      setCurrentPlan(null);
      setIsPlanPending(false);
      return;
    }

    const controller = new AbortController();
    setIsPlanPending(true);

    fetch("/api/subscription/status", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load subscription");
        return response.json() as Promise<{ plan: string }>;
      })
      .then((subscription) => setCurrentPlan(subscription.plan))
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          toast.error("Could not load your current plan. Please refresh.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsPlanPending(false);
      });

    return () => controller.abort();
  }, [isSessionPending, session?.user?.id]);

  const handlePurchase = async (plan: string) => {
    if (!session?.user) {
      router.push("/sign-in");
      return;
    }

    if (plan === "FREE") {
      router.push("/dashboard");
      return;
    }

    if (currentPlan === plan) {
      toast.info("You are already subscribed to this plan.");
      return;
    }

    setLoadingPlan(plan);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (response.ok) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.error || "Failed to create checkout session.");
        console.error("Checkout error:", data.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );
      console.error("Error purchasing plan:", error);
    } finally {
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
            Start free. Choose Creator when you need more.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan, index) => {
            const isCurrentPlan = Boolean(
              session?.user && currentPlan === plan.type,
            );
            const hasPaidPlan = Boolean(
              session?.user && currentPlan && currentPlan !== "FREE",
            );
            const buttonLabel = isPlanPending
              ? "Checking your plan…"
              : isCurrentPlan
                ? plan.type === "FREE"
                  ? "Current Plan"
                  : "Already Subscribed"
                : hasPaidPlan && plan.type === "FREE"
                  ? "Included in Your Plan"
                  : plan.cta;

            return (
            <Card
              key={index}
              className={cn(
                "relative flex h-full flex-col gap-4 rounded-2xl border bg-transparent py-5",
                plan.isPopular
                  ? "border-primary"
                  : "border-border",
              )}
            >
              <CardHeader className="gap-3 px-5 py-0">
                <div>
                  <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold tracking-tight">{plan.name}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={plan.isPopular ? "default" : "outline"} className="rounded-full px-2.5 py-0.5 text-[11px]">
                        {plan.accent}
                      </Badge>
                      {isCurrentPlan && <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">Current plan</Badge>}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">{plan.description}</p>
                </div>

                <div className="flex items-end gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="mb-1 text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 px-5">
                <ul className="space-y-2 border-t border-border pt-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="leading-5 text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="px-5 pt-0">
                <Button
                  onClick={() => handlePurchase(plan.type)}
                  size="lg"
                  className={cn(
                    "h-10 w-full rounded-lg text-sm font-medium",
                    !plan.isPopular && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                  )}
                  aria-current={isCurrentPlan ? "true" : undefined}
                  disabled={
                    isSessionPending ||
                    isPlanPending ||
                    isCurrentPlan ||
                    (hasPaidPlan && plan.type === "FREE") ||
                    loadingPlan === plan.type
                  }
                >
                  {(loadingPlan === plan.type || isPlanPending) && (
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
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Feature comparison</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">What’s included vs. what’s not</h2>
              <p className="mt-2 text-sm text-muted-foreground">This comparison makes it clear which plan fits your creator workflow best.</p>
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
                      Free
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                      Creator
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-t border-border/70 align-top">
                    <td className="px-4 py-4 text-foreground">{row.label}</td>
                    <td className="px-4 py-4 text-muted-foreground">{row.free}</td>
                    <td className="px-4 py-4 text-muted-foreground">{row.creator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Workflow className="h-4 w-4 text-primary" /> Free plan</div>
              <p className="text-sm text-muted-foreground">Best for testing the idea, creating a few public maps, and sharing a simple course outline with your audience.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles className="h-4 w-4 text-violet-500" /> Creator plan</div>
              <p className="text-sm text-muted-foreground">Best for creators who want a more visual, branded, shareable, and AI-assisted course experience.</p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default PricingPage;

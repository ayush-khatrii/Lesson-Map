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
import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

const PricingPage = () => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const handlePurchase = async (plan: string) => {
    if (!session?.user) {
      router.push("/sign-in");
      return;
    }

    if (plan === "FREE") {
      router.push("/dashboard");
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
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1 text-xs font-medium">
            Pricing
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Pick the plan that fits your course-building flow
          </h1>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            Start simple with the Free plan, or upgrade to Creator for flow-style course maps, AI generation, and a more polished public presentation.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={cn(
                "relative flex h-full flex-col rounded-3xl border bg-background/60 backdrop-blur transition-all duration-300",
                plan.isPopular
                  ? "border-primary shadow-2xl shadow-primary/10 lg:-translate-y-1"
                  : "border-border/60 hover:border-border",
              )}
            >
              {plan.isPopular && (
                <Badge className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1 text-xs font-medium shadow-sm">
                  {plan.accent}
                </Badge>
              )}
              {!plan.isPopular && (
                <Badge variant="outline" className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1 text-xs font-medium shadow-sm">
                  {plan.accent}
                </Badge>
              )}
              <CardHeader className="space-y-4 pb-6 pt-8">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                </div>

                <div className="flex items-end gap-1">
                  <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="mb-1 text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="leading-6 text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-6">
                <Button
                  onClick={() => handlePurchase(plan.type)}
                  size="lg"
                  className={cn(
                    "h-12 w-full rounded-xl text-sm font-medium",
                    !plan.isPopular && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                  )}
                  disabled={loadingPlan === plan.name}
                >
                  {loadingPlan === plan.name && <FaSpinner className="mr-2 h-4 w-4 animate-spin" />}
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <section className="mt-14 rounded-3xl border border-border bg-card/70 p-6 shadow-sm md:p-8">
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

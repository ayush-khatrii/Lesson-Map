"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type State = "checking" | "active" | "pending" | "error" | "signin";

export function CheckoutReturn() {
  const params = useSearchParams();
  const subscriptionId = params.get("subscription_id");
  const plan = params.get("plan");
  const [state, setState] = useState<State>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let checks = 0;
    setState("checking");
    const deadline = setTimeout(() => {
      setState("pending");
      controller.abort();
      clearTimeout(timer);
    }, 60000);

    async function check() {
      try {
        const response = subscriptionId && plan
          ? await fetch("/api/subscription/confirm", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subscriptionId, plan }),
              cache: "no-store", signal: controller.signal,
            })
          : await fetch("/api/subscription/status", {
              cache: "no-store", signal: controller.signal,
            });
        if (controller.signal.aborted) return;
        if (response.status === 401) { clearTimeout(deadline); setState("signin"); return; }
        if (!response.ok) throw new Error("Subscription check failed");
        const subscription = await response.json();
        if (controller.signal.aborted) return;
        // Only the authenticated database state can confirm access. Never trust
        // the payment status supplied in the redirect's query parameters.
        if (subscription.subscriptionStatus === "active" &&
            ["CREATOR", "PROFESSIONAL"].includes(subscription.plan) &&
            (!subscriptionId || subscription.subscriptionId === subscriptionId) &&
            (!plan || subscription.plan === plan)) {
          setState("active");
          clearTimeout(deadline);
        } else if (++checks >= 20) {
          setState("pending");
          clearTimeout(deadline);
        } else {
          timer = setTimeout(check, 3000);
        }
      } catch {
        if (!controller.signal.aborted) { clearTimeout(deadline); setState("error"); }
      }
    }
    void check();
    return () => { controller.abort(); clearTimeout(timer); clearTimeout(deadline); };
  }, [subscriptionId, plan, attempt]);

  const messages: Record<State, [string, string]> = {
    checking: ["Confirming your subscription", "Please wait while we check your payment confirmation."],
    active: ["Your subscription is active", "Your paid features are ready. Continue to your dashboard."],
    pending: ["Your subscription is not active yet", "Payment confirmation can take a little longer. If you completed payment, check again shortly. If you cancelled or payment failed, return to pricing to try again."],
    error: ["We could not check your subscription", "Please check your connection and try again."],
    signin: ["Sign in to confirm your subscription", "Use the same account you used to start checkout."],
  };
  const callbackUrl = `/checkout/return?${params.toString()}`;

  return (
    <div className="w-full space-y-5 rounded-2xl border bg-card p-8 text-center">
      <div role="status" aria-live="polite" className="space-y-3">
        <h1 className="text-2xl font-semibold">{messages[state][0]}</h1>
        <p className="text-sm text-muted-foreground">{messages[state][1]}</p>
      </div>
      {state === "active" && <Button asChild><Link href="/dashboard">Go to dashboard</Link></Button>}
      {state === "signin" && <Button asChild><Link href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Sign in</Link></Button>}
      {(state === "pending" || state === "error") && <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => setAttempt((value) => value + 1)}>Check again</Button>
        <Button asChild variant="outline"><Link href="/pricing">Return to pricing</Link></Button>
      </div>}
    </div>
  );
}

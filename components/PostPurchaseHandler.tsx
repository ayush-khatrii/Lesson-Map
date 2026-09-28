"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2_000;
// A request that never settles must not be able to stall the poll loop.
const REQUEST_TIMEOUT_MS = 8_000;

type SubscriptionStatusResponse = {
  plan?: string;
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
};

export default function PostPurchaseHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const startedRef = useRef(false);
  // The overlay used to be rendered purely from the URL. If any early return in
  // the effect below was hit (pending session, failed session request, a fetch
  // that never resolved) nothing ever removed those params, so the overlay
  // stayed on screen forever. Visibility now depends on this explicit state.
  const [isSettled, setIsSettled] = useState(false);

  const subscriptionId = searchParams.get("subscription_id");
  const checkoutStatus = searchParams.get("status");
  const isPurchaseReturn = Boolean(subscriptionId && checkoutStatus);

  const delay = (milliseconds: number) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  useEffect(() => {
    if (!isPurchaseReturn || isPending || startedRef.current) return;

    startedRef.current = true;
    let cancelled = false;

    const finish = (options?: {
      title: string;
      description: string;
      variant: "success" | "error" | "info";
    }) => {
      setIsSettled(true);
      if (options) {
        if (options.variant === "success") {
          toast.success(options.title, { description: options.description });
        } else if (options.variant === "error") {
          toast.error(options.title, { description: options.description });
        } else {
          toast.info(options.title, {
            description: options.description,
            duration: 8_000,
          });
        }
      }
      // Drop the checkout params so a reload does not restart this flow.
      router.replace("/dashboard");
      router.refresh();
    };

    // The dashboard is already server-guarded, so there is no need to bounce to
    // /sign-in from here. Doing so while the server session *was* valid created
    // a dashboard -> sign-in -> dashboard redirect loop.
    if (!session?.user) {
      setIsSettled(true);
      return;
    }

    if (checkoutStatus !== "active") {
      finish({
        title: "Payment not completed",
        description: "No charge was made. You can try again from the dashboard.",
        variant: "error",
      });
      return;
    }

    async function waitForVerifiedWebhook() {
      for (let attempt = 0; attempt < POLL_ATTEMPTS && !cancelled; attempt += 1) {
        try {
          const response = await fetch("/api/subscription/status", {
            cache: "no-store",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });

          if (response.ok) {
            const subscription =
              (await response.json()) as SubscriptionStatusResponse;

            const isVerified =
              subscription.subscriptionId === subscriptionId &&
              subscription.plan !== "FREE" &&
              subscription.subscriptionStatus === "active";

            if (isVerified) {
              finish({
                title: "Your paid plan is active",
                description: "Welcome to LessonMap!",
                variant: "success",
              });
              return;
            }
          }
        } catch {
          // A temporary or timed-out request should not interrupt polling.
        }

        if (cancelled) return;
        await delay(POLL_INTERVAL_MS);
      }

      if (cancelled) return;

      finish({
        title: "Payment received",
        description:
          "Activation is still processing. Refresh in a moment if your plan has not updated.",
        variant: "info",
      });
    }

    void waitForVerifiedWebhook();

    return () => {
      cancelled = true;
    };
  }, [checkoutStatus, isPending, isPurchaseReturn, router, session?.user, subscriptionId]);

  if (!isPurchaseReturn || isSettled) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[1000] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-background/95 px-5 py-3 shadow-lg backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <div>
          <p className="text-sm font-semibold">Confirming your payment</p>
          <p className="text-xs text-muted-foreground">
            Waiting for secure confirmation from Dodo Payments…
          </p>
        </div>
      </div>
    </div>
  );
}

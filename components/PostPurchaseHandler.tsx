"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2_000;
// A request that never settles must not be able to stall the poll loop.
const REQUEST_TIMEOUT_MS = 8_000;
// Absolute backstop. The poll loop below always terminates on its own, but if a
// request ever hangs in a way AbortSignal cannot interrupt, the overlay must
// still be torn down.
const MAX_WAIT_MS =
  POLL_ATTEMPTS * (POLL_INTERVAL_MS + REQUEST_TIMEOUT_MS) + 5_000;

const delay = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const PENDING_MESSAGE = {
  title: "Payment received",
  description:
    "Activation is still processing. Refresh in a moment if your plan has not updated.",
  variant: "info",
} as const;

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
  // `finish` may be reachable from both the poll loop and the watchdog timer;
  // never toast or redirect twice.
  const settledRef = useRef(false);

  const subscriptionId = searchParams.get("subscription_id");
  const checkoutStatus = searchParams.get("status");
  const isPurchaseReturn = Boolean(subscriptionId && checkoutStatus);

  // A primitive, so a refetched session cannot change this effect's deps.
  // better-auth recreates the `user` object on every fetch, and it refetches on
  // window focus (see session-refresh). Keying the effect on `session?.user`
  // meant every refetch re-ran the effect, which cancelled the in-flight poll
  // while `startedRef` refused to start a new one - the spinner never resolved.
  const hasUser = Boolean(session?.user);

  // Same reasoning for the router: it must not be an effect dependency.
  const routerRef = useRef(router);
  routerRef.current = router;

  const finish = useCallback(
    (options?: {
      title: string;
      description: string;
      variant: "success" | "error" | "info";
    }) => {
      if (settledRef.current) return;
      settledRef.current = true;

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
      routerRef.current.replace("/dashboard");
      routerRef.current.refresh();
    },
    [],
  );

  useEffect(() => {
    if (!isPurchaseReturn || isPending || startedRef.current) return;

    startedRef.current = true;

    // The dashboard is already server-guarded, so there is no need to bounce to
    // /sign-in from here. Doing so while the server session *was* valid created
    // a dashboard -> sign-in -> dashboard redirect loop.
    if (!hasUser) {
      finish();
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

    let cancelled = false;

    const stop = () => {
      cancelled = true;
      window.clearTimeout(watchdog);
    };

    const watchdog = window.setTimeout(() => {
      stop();
      finish(PENDING_MESSAGE);
    }, MAX_WAIT_MS);

    async function waitForVerifiedWebhook() {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
        if (cancelled) return;

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
              stop();
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

      stop();
      finish(PENDING_MESSAGE);
    }

    void waitForVerifiedWebhook();

    return stop;
  }, [
    checkoutStatus,
    finish,
    hasUser,
    isPending,
    isPurchaseReturn,
    subscriptionId,
  ]);

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

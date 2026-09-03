"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2_000;

export default function PostPurchaseHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const startedRef = useRef(false);

  const subscriptionId = searchParams.get("subscription_id");
  const checkoutStatus = searchParams.get("status");
  const isPurchaseReturn = Boolean(subscriptionId && checkoutStatus);

  useEffect(() => {
    if (!isPurchaseReturn || isPending || startedRef.current) return;

    if (!session?.user) {
      const callbackUrl = `/dashboard?${searchParams.toString()}`;
      router.replace(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    startedRef.current = true;
    let cancelled = false;

    const delay = (milliseconds: number) =>
      new Promise((resolve) => window.setTimeout(resolve, milliseconds));

    async function waitForVerifiedWebhook() {
      if (checkoutStatus !== "active") {
        toast.error("The payment was not completed.");
        router.replace("/dashboard");
        return;
      }

      for (let attempt = 0; attempt < POLL_ATTEMPTS && !cancelled; attempt += 1) {
        try {
          const response = await fetch("/api/subscription/status", {
            cache: "no-store",
          });
          if (response.ok) {
            const subscription = (await response.json()) as {
              plan?: string;
              subscriptionId?: string | null;
              subscriptionStatus?: string | null;
            };

            const isVerified =
              subscription.subscriptionId === subscriptionId &&
              subscription.plan !== "FREE" &&
              subscription.subscriptionStatus === "active";

            if (isVerified) {
              toast.success("Your paid plan is active. Welcome to LessonMap!");
              router.replace("/dashboard");
              router.refresh();
              return;
            }
          }
        } catch {
          // A temporary request failure should not interrupt webhook polling.
        }

        await delay(POLL_INTERVAL_MS);
      }

      if (!cancelled) {
        toast.info(
          "Payment received. Activation is still processing; refresh shortly if your plan has not updated.",
          { duration: 8_000 },
        );
        router.replace("/dashboard");
      }
    }

    void waitForVerifiedWebhook();
    return () => {
      cancelled = true;
    };
  }, [
    checkoutStatus,
    isPending,
    isPurchaseReturn,
    router,
    searchParams,
    session?.user,
    subscriptionId,
  ]);

  if (!isPurchaseReturn) return null;

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

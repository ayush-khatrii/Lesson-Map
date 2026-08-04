"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2, Crown } from "lucide-react";

export default function PostPurchaseHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const activatedRef = useRef(false);

  const subscriptionId = searchParams.get("subscription_id");
  const status = searchParams.get("status");
  const email = searchParams.get("email");
  const isPurchaseReturn =
    !!subscriptionId && status === "active" && !!email;

  useEffect(() => {
    if (!isPurchaseReturn || isPending || activatedRef.current) return;

    if (!session?.user) {
      const returnUrl = `/?${searchParams.toString()}`;
      router.replace(
        `/sign-in?callbackUrl=${encodeURIComponent(returnUrl)}`,
      );
      return;
    }

    activatedRef.current = true;

    async function activatePlan() {
      try {
        const response = await fetch("/api/subscription/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriptionId,
            status,
            email: decodeURIComponent(email!),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to activate your plan.");
        }

        toast.custom(
          (t) => (
            <div className="pointer-events-auto flex w-full max-w-md rounded-2xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-violet-950 dark:via-zinc-900 dark:to-fuchsia-950 p-1 shadow-2xl shadow-violet-200/50 dark:shadow-violet-900/30">
              <div className="flex w-full items-start gap-4 rounded-xl bg-white/60 dark:bg-zinc-900/60 p-4 backdrop-blur">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-violet-900 dark:text-violet-100">
                    🎉 Welcome to Creator!
                  </p>
                  <p className="mt-0.5 text-xs text-violet-600/80 dark:text-violet-300/80 leading-relaxed">
                    Your plan is now active. Unlimited courses, AI generations,
                    and creator-native branding are unlocked.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Plan activated
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toast.dismiss(t)}
                  className="shrink-0 rounded-md p-1 text-violet-400 hover:text-violet-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ),
          { duration: 6000 },
        );

        router.replace("/dashboard");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not activate your plan. Please contact support.",
        );
        router.replace("/");
      }
    }

    activatePlan();
  }, [
    isPurchaseReturn,
    isPending,
    session?.user,
    subscriptionId,
    status,
    email,
    searchParams,
    router,
  ]);

  if (!isPurchaseReturn) return null;

  return (
    <div className="fixed inset-x-0 top-16 z-[1000] flex justify-center px-4 pointer-events-none">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-background/95 px-5 py-3 shadow-lg backdrop-blur">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          {isPending || session?.user ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">Activating your Creator plan</p>
          <p className="text-xs text-muted-foreground">
            {isPending
              ? "Checking your account…"
              : session?.user
                ? "Upgrading your account…"
                : "Sign in to finish activation…"}
          </p>
        </div>
      </div>
    </div>
  );
}

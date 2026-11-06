"use client";

import { useQuery } from "@tanstack/react-query";
import { hasFlowAccess } from "./graph";

export const subscriptionPlanKey = (userId: string) => [
  "subscription-plan",
  userId,
];

export function useSubscriptionPlan(userId?: string) {
  const query = useQuery({
    queryKey: subscriptionPlanKey(userId ?? ""),
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/subscription/status", {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("Could not load subscription");
      const data = await response.json();
      if (!data || !["FREE", "CREATOR", "PROFESSIONAL"].includes(data.plan)) {
        throw new Error("Invalid subscription status");
      }
      return data as { plan: string };
    },
    refetchOnWindowFocus: "always",
    staleTime: 0,
    retry: 1,
  });
  const plan = userId && !query.isError ? (query.data?.plan ?? null) : null;
  return {
    plan,
    canUseFlow: hasFlowAccess(plan),
    isLoading: Boolean(userId) && query.isPending,
    isError: Boolean(userId) && query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

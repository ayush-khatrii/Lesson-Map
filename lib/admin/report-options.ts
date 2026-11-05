import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "./client";
import { adminReportParams } from "./report-query";

export function adminReportOptions<T = unknown>(resource: string, search = "") {
  const params = adminReportParams(resource, search);
  return queryOptions({
    queryKey: ["admin", resource, params] as const,
    queryFn: ({ signal }) =>
      adminFetch<T>(`/api/admin/${resource}?${params}`, { signal }),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

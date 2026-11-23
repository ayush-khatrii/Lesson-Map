import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CourseAnalyticsDataSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading analytics</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="gap-4 bg-card py-5">
              <CardHeader className="flex min-h-10 flex-row items-center justify-between px-5">
                <Skeleton className="h-4 w-28 max-w-full" />
                <Skeleton className="hidden size-8 rounded-lg sm:block" />
              </CardHeader>
              <CardContent className="px-5">
                <Skeleton className="h-9 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="gap-5 bg-card">
          <CardHeader className="gap-3 px-4 sm:px-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-60 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-6">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-8 w-28" />
              ))}
            </div>
            <div className="flex h-[280px] flex-col justify-between rounded-lg border-b border-l border-border px-4 py-6 sm:h-[340px]">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="h-px w-full bg-border/60" />
              ))}
            </div>
            <div className="flex justify-center gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CourseAnalyticsPageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:px-8">
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link href="/dashboard">Back to courses</Link>
      </Button>
      <div
        role="status"
        aria-busy="true"
        className="border-b border-border pb-8"
      >
        <span className="sr-only">Loading course details</span>
        <div
          aria-hidden="true"
          className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
        >
          <div className="space-y-3">
            <Skeleton className="h-4 w-28 max-w-full" />
            <Skeleton className="h-9 w-64 max-w-full sm:w-80" />
          </div>
          <Skeleton className="h-9 w-44" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
      >
        <Skeleton className="h-5 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <CourseAnalyticsDataSkeleton />
    </main>
  );
}

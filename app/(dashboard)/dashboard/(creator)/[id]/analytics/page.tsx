import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { sessionUserId } from "@/lib/launch-access";
import { db } from "@/lib/prisma";
import { effectiveAiPlan } from "@/lib/ai/schema";
import CourseAnalytics from "@/components/dashboard/CourseAnalytics";
import { Button } from "@/components/ui/button";
import { CourseAnalyticsDataSkeleton } from "@/components/dashboard/CourseAnalyticsSkeleton";
import { getCourseAnalytics } from "@/lib/course-analytics-server";

async function InitialCourseAnalytics({
  course,
}: {
  course: { id: string; createdAt: Date };
}) {
  try {
    const initialData = await getCourseAnalytics(course, "30d");
    return (
      <CourseAnalytics
        courseId={course.id}
        initialData={initialData}
        initialDataUpdatedAt={Date.now()}
      />
    );
  } catch (error) {
    console.error("Initial course analytics failed", error);
    // Keep the report's existing API retry and error UI available.
    return <CourseAnalytics courseId={course.id} />;
  }
}

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await sessionUserId();
  if (!userId)
    redirect(
      `/sign-in?callbackUrl=${encodeURIComponent(`/dashboard/${id}/analytics`)}`,
    );
  const course = await db.course.findFirst({
    where: { id, userId },
    select: {
      id: true,
      courseName: true,
      createdAt: true,
      isPublic: true,
      shareSlug: true,
      user: {
        select: {
          plan: true,
          subscriptionStatus: true,
          subscriptionCancelAtPeriodEnd: true,
          subscriptionCurrentPeriodEnd: true,
        },
      },
    },
  });
  if (!course) notFound();
  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:px-8">
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link href="/dashboard">Back to courses</Link>
      </Button>
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">
        <div className="min-w-0 space-y-3">
          <p className="text-sm text-muted-foreground">Course analytics</p>
          <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
            {course.courseName}
          </h1>
        </div>
        {course.isPublic && course.shareSlug && (
          <Button asChild variant="outline" className="self-start sm:self-auto">
            <Link href={`/p/${encodeURIComponent(course.shareSlug)}`}>
              View public curriculum
            </Link>
          </Button>
        )}
      </header>
      {effectiveAiPlan(course.user) === "FREE" ? (
        <section className="space-y-4 rounded-xl border p-6">
          <h2 className="text-xl font-semibold">
            See how your curriculum performs
          </h2>
          <p>Course analytics is available on Creator and Professional.</p>
          <Button asChild>
            <Link href="/pricing">Upgrade plan</Link>
          </Button>
        </section>
      ) : (
        <Suspense fallback={<CourseAnalyticsDataSkeleton />}>
          <InitialCourseAnalytics course={course} />
        </Suspense>
      )}
    </main>
  );
}

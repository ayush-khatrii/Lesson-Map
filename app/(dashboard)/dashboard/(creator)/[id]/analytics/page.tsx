import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessionUserId } from "@/lib/launch-access";
import { db } from "@/lib/prisma";
import { effectiveAiPlan } from "@/lib/ai/schema";
import CourseAnalytics from "@/components/dashboard/CourseAnalytics";
import { Button } from "@/components/ui/button";

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
    include: { user: true },
  });
  if (!course) notFound();
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm underline">
        Back to courses
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Course analytics</p>
          <h1 className="mt-1 break-words text-3xl font-semibold">
            {course.courseName}
          </h1>
        </div>
        {course.isPublic && course.shareSlug && (
          <Button asChild variant="outline">
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
        <CourseAnalytics courseId={id} />
      )}
    </main>
  );
}

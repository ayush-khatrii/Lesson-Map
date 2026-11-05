import { auth } from "@/lib/auth";
import { getUserCourses } from "@/lib/course-cache";
import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardCourses, {
  type CourseWithRelations,
} from "@/components/dashboard/DashboardCourses";
import PostPurchaseHandler from "@/components/PostPurchaseHandler";
import {
  BookOpen,
  Layers,
  Plus,
  Sparkles,
  GraduationCap,
  BarChart3,
  Clock,
} from "lucide-react";

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function StatCard({ label, value, icon: Icon }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 p-4 sm:px-6 sm:py-5">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

const Dashboard = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/sign-in");

  const userId = session.session.userId;

  const courses = await getUserCourses(userId);

  const initialCourses: CourseWithRelations[] = courses.map((course) => ({
    ...course,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    Module: course.Module.map((mod) => ({
      ...mod,
      createdAt: mod.createdAt.toISOString(),
      updatedAt: mod.updatedAt.toISOString(),
      Lesson: mod.Lesson.map((lesson) => ({
        ...lesson,
        createdAt: lesson.createdAt.toISOString(),
        updatedAt: lesson.updatedAt.toISOString(),
      })),
    })),
  }));

  const totalModules = initialCourses.reduce((a, c) => a + c.Module.length, 0);
  const totalLessons = initialCourses.reduce(
    (a, c) => a + c.Module.reduce((ma, m) => ma + m.Lesson.length, 0),
    0,
  );
  const recentCourse = initialCourses[0];
  const firstName = session.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PostPurchaseHandler />
      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl py-2 text-center">
          <div className="flex flex-col items-center gap-5">
            <div className="min-w-0 w-full">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Creator workspace
              </p>
              <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
                Welcome back, {firstName}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                {initialCourses.length === 0
                  ? "Start mapping your first course and build structured learning journeys."
                  : `You have ${initialCourses.length} ${initialCourses.length === 1 ? "course" : "courses"} in your workspace.`}
              </p>
              {recentCourse && (
                <div className="mx-auto mt-3 flex max-w-lg items-start justify-center gap-2">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    Last edited{" "}
                    <span className="font-medium text-foreground">
                      {recentCourse.courseName}
                    </span>{" "}
                    {timeAgo(new Date(recentCourse.updatedAt))}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/create/new">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Generate
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/dashboard/create/new">
                  <Plus className="w-3.5 h-3.5" /> New Course
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-4 [&>div:nth-child(odd)]:border-r [&>div:nth-child(-n+2)]:border-b [&>div]:border-border md:[&>div:nth-child(-n+2)]:border-b-0 md:[&>div:nth-child(2)]:border-r">
          <StatCard
            label="Total Courses"
            value={initialCourses.length}
            icon={GraduationCap}
          />
          <StatCard
            label="Total Modules"
            value={totalModules}
            icon={Layers}
          />
          <StatCard
            label="Total Lessons"
            value={totalLessons}
            icon={BookOpen}
          />
          <StatCard
            label="Lessons per module"
            value={
              totalModules > 0 ? (totalLessons / totalModules).toFixed(1) : "—"
            }
            icon={BarChart3}
          />
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                Your Courses
              </h2>
              <Badge
                variant="outline"
                className="border-border text-xs text-muted-foreground"
              >
                {initialCourses.length}
              </Badge>
            </div>
          </div>

          <DashboardCourses
            initialCourses={initialCourses}
            currentUserId={userId}
          />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

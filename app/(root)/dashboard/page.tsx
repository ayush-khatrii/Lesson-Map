import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
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

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-none text-card-foreground">
            {value}
          </p>
          <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {sub && (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">
              {sub}
            </p>
          )}
        </div>
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

  const courses = await db.course.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      Module: {
        include: { Lesson: true },
      },
    },
  });

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
    <div className="min-h-screen my-20 bg-background text-foreground">
      <PostPurchaseHandler />
      <main className="mx-auto container space-y-8 px-5 py-8 md:px-8">
        <section className="relative overflow-hidden px-6 py-8 md:px-10">
          <div className="flex flex-col items-center justify-center gap-4 text-center relative z-10">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Welcome back
              </p>
              <h1 className="mb-1 text-2xl font-bold tracking-tight text-card-foreground md:text-5xl">
                Hey, {firstName} 👋
              </h1>
              <p className="max-w-sm text-sm text-muted-foreground">
                {initialCourses.length === 0
                  ? "Start mapping your first course and build structured learning journeys."
                  : `You have ${initialCourses.length} ${initialCourses.length === 1 ? "course" : "courses"} in your workspace. Keep building!`}
              </p>
              {recentCourse && (
                <div className="mt-3 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Last edited{" "}
                    <span className="font-medium text-foreground">
                      {recentCourse.courseName}
                    </span>{" "}
                    {timeAgo(new Date(recentCourse.updatedAt))}
                  </span>
                </div>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                asChild
              >
                <Link href="/dashboard/create/new">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Generate
                </Link>
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                asChild
              >
                <Link href="/dashboard/create/new">
                  <Plus className="w-3.5 h-3.5" /> New Course
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Courses"
            value={initialCourses.length}
            icon={GraduationCap}
            sub="In your workspace"
          />
          <StatCard
            label="Total Modules"
            value={totalModules}
            icon={Layers}
            sub="Across all courses"
          />
          <StatCard
            label="Total Lessons"
            value={totalLessons}
            icon={BookOpen}
            sub="Mapped so far"
          />
          <StatCard
            label="Avg. Lessons/Module"
            value={
              totalModules > 0 ? (totalLessons / totalModules).toFixed(1) : "—"
            }
            icon={BarChart3}
            sub="Depth indicator"
          />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
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

            {initialCourses.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                asChild
              >
                <Link href="/dashboard/create/new">
                  <Plus className="w-3.5 h-3.5" /> New Course
                </Link>
              </Button>
            )}
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

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  Globe2,
  Layers3,
  LockKeyhole,
  Mail,
  Settings2,
  Share2,
  Sparkles,
} from "lucide-react";
import UpdateProfileForm from "@/components/forms/UpdateProfileForm";
import UpdateSocialLinksForm from "@/components/forms/UpdateSocialLinksForm";
import SettingsTabs from "@/components/settings/SettingsTabs";
import ToggleCoursePublicButton from "@/components/ToggleCoursePublicButton";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const user = session.user;
  const [dbUser, courses] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        plan: true,
        socialInstagram: true,
        socialLinkedin: true,
        socialYoutube: true,
        socialGithub: true,
        socialTwitter: true,
        socialWebsite: true,
      },
    }),
    db.course.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { Module: { include: { Lesson: true } } },
    }),
  ]);

  const totalModules = courses.reduce((total, course) => total + course.Module.length, 0);
  const totalLessons = courses.reduce(
    (total, course) => total + course.Module.reduce((count, module) => count + module.Lesson.length, 0),
    0,
  );
  const publicCourses = courses.filter((course) => course.isPublic).length;
  const appUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.NODE_ENV === "production"
        ? "https://lessonmap.vercel.app"
        : "http://localhost:3000")
  ).replace(/\/$/, "");
  const plan = dbUser?.plan ?? "FREE";

  const socialInitialValues = {
    socialInstagram: dbUser?.socialInstagram ?? "",
    socialLinkedin: dbUser?.socialLinkedin ?? "",
    socialYoutube: dbUser?.socialYoutube ?? "",
    socialGithub: dbUser?.socialGithub ?? "",
    socialTwitter: dbUser?.socialTwitter ?? "",
    socialWebsite: dbUser?.socialWebsite ?? "",
  };
  const stats = [
    { label: "Courses", value: courses.length, icon: BookOpen },
    { label: "Modules", value: totalModules, icon: Layers3 },
    { label: "Lessons", value: totalLessons, icon: FileText },
    { label: "Published", value: publicCourses, icon: Globe2 },
  ];

  return (
    <main className="min-h-screen bg-background pb-16 pt-24 text-foreground sm:pt-28">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground dark:text-primary">Account settings</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Your workspace</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Manage your profile, see what you have built, and control how your courses are shared.</p>
          </div>
          <Button variant="outline" asChild className="h-10 rounded-xl border-border bg-background px-4 shadow-sm"><Link href="/dashboard">Back to dashboard <ArrowUpRight className="size-4" /></Link></Button>
        </header>

        <div className="mt-8">
          <SettingsTabs
            profile={
              <>
                <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><Settings2 className="size-5" /></span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-xl font-semibold tracking-tight">{user.name}</h2><Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"><Sparkles className="mr-1 size-3 text-primary-foreground dark:text-primary" />{plan}</Badge></div>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-4 shrink-0" />{user.email}</p>
                <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5 shrink-0" />Member since {formatDate(user.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-500" />Account active</div>
          </div>
          <div className="grid grid-cols-2 border-t border-border/70 sm:grid-cols-4">
            {stats.map(({ label, value, icon: Icon }) => <div key={label} className="border-b border-border/70 p-4 last:border-b-0 even:border-l sm:border-b-0 sm:even:border-l sm:[&:not(:first-child)]:border-l"><Icon className="size-4 text-muted-foreground" /><p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
          </div>
        </section>

                <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
                  <div className="mb-7"><h2 className="text-lg font-semibold tracking-tight">Profile details</h2><p className="mt-1 text-sm text-muted-foreground">Update the name shown on your courses.</p></div>
                  <UpdateProfileForm initialName={user.name} />
                </section>
              </>
            }
            settings={
              <>
                <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
                  <div className="mb-7">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary-foreground dark:text-primary"><Share2 className="size-4" /></span>
                    <h2 className="mt-4 text-lg font-semibold tracking-tight">Social links</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Add your profiles once and they appear at the bottom of your public course pages. Each course has its own switch if you would rather keep them hidden.</p>
                  </div>
                  <UpdateSocialLinksForm initialValues={socialInitialValues} />
                </section>
                <aside className="rounded-2xl border border-border/80 bg-muted/20 p-6 shadow-sm sm:p-8">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary-foreground dark:text-primary"><Sparkles className="size-4" /></span>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Current plan</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">{plan}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Upgrade when you need branded-free course pages or Markdown exports.</p>
                  <Button variant="outline" className="mt-6 w-full rounded-xl bg-background" asChild><Link href="/pricing">View plans <ArrowUpRight className="size-4" /></Link></Button>
                </aside>
                <section className="rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border/70 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div><h2 className="text-lg font-semibold tracking-tight">Course sharing</h2><p className="mt-1 text-sm text-muted-foreground">Choose which courses learners can open with a link.</p></div>
            <Badge variant="secondary" className="w-fit rounded-full px-3 py-1.5">{publicCourses} of {courses.length} published</Badge>
          </div>
          <div className="p-4 sm:p-6">
            {courses.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center"><span className="grid size-11 place-items-center rounded-xl bg-background shadow-sm"><BookOpen className="size-5 text-muted-foreground" /></span><h3 className="mt-4 font-semibold">Your course list is empty</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">Create your first course, then return here to publish it when it is ready.</p><Button className="mt-6 rounded-xl bg-foreground text-background" asChild><Link href="/dashboard/create/new">Create a course</Link></Button></div>
            ) : (
              <div className="divide-y divide-border/70">
                {courses.map((course) => {
                  const lessonCount = course.Module.reduce((count, module) => count + module.Lesson.length, 0);
                  return <article key={course.id} className="flex flex-col gap-4 px-2 py-5 first:pt-2 sm:flex-row sm:items-center sm:justify-between sm:px-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold tracking-tight">{course.courseName}</h3><Badge variant="secondary" className={course.isPublic ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : ""}>{course.isPublic ? <><Globe2 className="mr-1 size-3" />Public</> : <><LockKeyhole className="mr-1 size-3" />Private</>}</Badge></div><p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">{course.description || "No description yet."}</p><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{course.Module.length} modules</span><span>{lessonCount} lessons</span><span>Created {formatDate(course.createdAt)}</span></div>{course.isPublic && course.shareSlug && <Link href={`/p/${course.shareSlug}`} className="mt-3 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-primary-foreground hover:underline dark:text-primary"><Globe2 className="size-3 shrink-0" />{appUrl}/p/{course.shareSlug}</Link>}</div><div className="flex shrink-0 items-center gap-2">{course.isPublic && course.shareSlug && <Button variant="ghost" size="sm" className="rounded-lg" asChild><Link href={`/p/${course.shareSlug}`}>View</Link></Button>}<ToggleCoursePublicButton courseId={course.id} isPublic={course.isPublic} shareSlug={course.shareSlug} canPublish={course.Module.length > 0} /></div></article>;
                })}
              </div>
            )}
          </div>
                </section>
              </>
            }
          />
        </div>
      </div>
    </main>
  );
}

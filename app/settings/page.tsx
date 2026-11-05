import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Sparkles,
} from "lucide-react";
import UpdateProfileForm from "@/components/forms/UpdateProfileForm";
import UpdateSocialLinksForm from "@/components/forms/UpdateSocialLinksForm";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";
import SettingsTabs from "@/components/settings/SettingsTabs";
import BillingTab from "@/components/settings/BillingTab";
import ToggleCoursePublicButton from "@/components/ToggleCoursePublicButton";
import { effectiveAiPlan } from "@/lib/ai/schema";

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
        customerId: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCancelAtPeriodEnd: true,
        socialInstagram: true,
        socialLinkedin: true,
        socialYoutube: true,
        socialGithub: true,
        socialTwitter: true,
        socialWebsite: true,
        // Only check existence; never send password hashes to the browser.
        accounts: {
          where: { providerId: "credential", password: { not: null } },
          select: { id: true },
          take: 1,
        },
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
  const plan = dbUser ? effectiveAiPlan(dbUser) : "FREE";
  const subscriptionPeriodEnd = dbUser?.subscriptionCurrentPeriodEnd ?? null;
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
    <main className="min-h-screen bg-background pb-12 pt-24 text-foreground sm:pt-28">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Account settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your profile, preferences, and billing in one place.</p>
          </div>
          <Button variant="outline" size="sm" asChild className="w-fit shadow-none">
            <Link href="/dashboard">Back to dashboard <ArrowUpRight className="size-3.5" /></Link>
          </Button>
        </header>

        <div className="mt-5">
          <SettingsTabs
            profile={
              <>
                <section aria-label="Account overview" className="overflow-hidden rounded-lg border border-border">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-primary">
                        <Settings2 className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="min-w-0 max-w-full break-words text-lg font-semibold tracking-tight">{user.name}</h2>
                          <Badge variant="outline" className="gap-1 text-[10px] uppercase tracking-wide">
                            <Sparkles className="size-3 text-primary" />{plan}
                          </Badge>
                        </div>
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="size-3.5 shrink-0" /><span className="break-all">{user.email}</span>
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="size-3.5 shrink-0" />Member since {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />Account active
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
                    {stats.map(({ label, value, icon: Icon }, index) => (
                      <div key={label} className={`flex items-center gap-2.5 p-3 sm:p-4 ${index % 2 ? "border-l border-border" : ""} ${index > 1 ? "border-t border-border sm:border-t-0" : ""} ${index === 2 ? "sm:border-l" : ""}`}>
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <div>
                          <dt className="text-xs text-muted-foreground">{label}</dt>
                          <dd className="text-lg font-semibold leading-6 tracking-tight">{value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </section>

                <section aria-labelledby="profile-heading" className="grid gap-4 rounded-lg border border-border p-4 sm:p-5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
                  <div>
                    <h2 id="profile-heading" className="text-sm font-semibold">Profile details</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Update the name shown on your courses.</p>
                  </div>
                  <UpdateProfileForm initialName={user.name} />
                </section>

                <section aria-labelledby="password-heading" className="grid gap-4 rounded-lg border border-border p-4 sm:p-5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
                  <div>
                    <h2 id="password-heading" className="flex items-center gap-2 text-sm font-semibold">
                      <LockKeyhole className="size-4 text-muted-foreground" />Change password
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Confirm your current password, then enter your new password twice.</p>
                  </div>
                  <ChangePasswordForm hasPassword={Boolean(dbUser?.accounts.length)} />
                </section>
              </>
            }
            settings={
              <>
                <section aria-labelledby="social-heading" className="grid gap-4 rounded-lg border border-border p-4 sm:p-5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
                  <div>
                    <h2 id="social-heading" className="text-sm font-semibold">Social links</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Shown at the bottom of your public course pages. You can hide them for individual courses.</p>
                  </div>
                  <UpdateSocialLinksForm initialValues={socialInitialValues} />
                </section>
                <section aria-labelledby="sharing-heading" className="overflow-hidden rounded-lg border border-border">
                  <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                      <h2 id="sharing-heading" className="text-sm font-semibold">Course sharing</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Choose which courses learners can open with a link.</p>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">{publicCourses} of {courses.length} published</Badge>
                  </div>
                  {courses.length === 0 ? (
                    <div className="flex flex-col items-center px-4 py-8 text-center">
                      <BookOpen className="size-5 text-muted-foreground" />
                      <h3 className="mt-3 text-sm font-semibold">Your course list is empty</h3>
                      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Create your first course, then publish it when it is ready.</p>
                      <Button size="sm" className="mt-4" asChild><Link href="/dashboard/create/new">Create a course</Link></Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {courses.map((course) => {
                        const lessonCount = course.Module.reduce((count, module) => count + module.Lesson.length, 0);
                        return (
                          <article key={course.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="min-w-0 max-w-full break-words text-sm font-semibold">{course.courseName}</h3>
                                <Badge variant="outline" className={course.isPublic ? "gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "gap-1 text-muted-foreground"}>
                                  {course.isPublic ? <Globe2 className="size-3" /> : <LockKeyhole className="size-3" />}
                                  {course.isPublic ? "Public" : "Private"}
                                </Badge>
                              </div>
                              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{course.description || "No description yet."}</p>
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>{course.Module.length} modules</span><span>{lessonCount} lessons</span><span>Created {formatDate(course.createdAt)}</span>
                              </div>
                              {course.isPublic && course.shareSlug && (
                                <Link href={`/p/${course.shareSlug}`} className="mt-2 inline-flex max-w-full items-center gap-1 text-xs text-primary hover:underline">
                                  <Globe2 className="size-3 shrink-0" /><span className="truncate">{appUrl}/p/{course.shareSlug}</span>
                                </Link>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {course.isPublic && course.shareSlug && <Button variant="ghost" size="sm" asChild><Link href={`/p/${course.shareSlug}`}>View</Link></Button>}
                              <ToggleCoursePublicButton courseId={course.id} isPublic={course.isPublic} shareSlug={course.shareSlug} canPublish={course.Module.length > 0} />
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            }
            billing={
              <BillingTab
                plan={plan}
                canManageBilling={Boolean(dbUser?.customerId)}
                subscriptionStatus={dbUser?.subscriptionStatus ?? null}
                cancelAtPeriodEnd={dbUser?.subscriptionCancelAtPeriodEnd ?? false}
                renewsOn={subscriptionPeriodEnd ? formatDate(subscriptionPeriodEnd) : null}
              />
            }
          />
        </div>
      </div>
    </main>
  );
}

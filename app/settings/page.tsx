import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Calendar,
  ExternalLink,
  Globe,
  Lock,
  Mail,
  MapPin,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import UpdateProfileForm from "@/components/forms/UpdateProfileForm";
import ToggleCoursePublicButton from "@/components/ToggleCoursePublicButton";

const getInitials = (name?: string) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const SettingsPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const user = session.user;

  const courses = await db.course.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      Module: {
        include: {
          Lesson: true,
        },
      },
    },
  });

  const totalModules = courses.reduce(
    (acc, c) => acc + c.Module.length,
    0,
  );
  const totalLessons = courses.reduce(
    (acc, c) =>
      acc + c.Module.reduce((mAcc, m) => mAcc + m.Lesson.length, 0),
    0,
  );
  const publicCourses = courses.filter((c) => c.isPublic).length;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="min-h-screen bg-background text-foreground px-4 md:px-10 py-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserIcon className="h-7 w-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Profile
            </h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>

        {/* ─── Profile Card ────────────────────────────────────── */}
        <Card className="rounded-xl border backdrop-blur-sm shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={user.image || undefined}
                alt={user.name || "User"}
              />
              <AvatarFallback className="text-2xl">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <Badge variant="secondary" className="capitalize">
                  <Sparkles className="mr-1 h-3 w-3" />
                  {(user as { plan?: string }).plan || "FREE"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(new Date(user.createdAt))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Edit Profile ────────────────────────────────────── */}
        <Card className="rounded-xl border backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <UpdateProfileForm initialName={user.name} />
          </CardContent>
        </Card>

        {/* ─── Stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-xl border backdrop-blur-sm shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold">{courses.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Courses</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border backdrop-blur-sm shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold">{totalModules}</p>
              <p className="text-xs text-muted-foreground mt-1">Modules</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border backdrop-blur-sm shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold">{totalLessons}</p>
              <p className="text-xs text-muted-foreground mt-1">Lessons</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border backdrop-blur-sm shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold">{publicCourses}</p>
              <p className="text-xs text-muted-foreground mt-1">Public</p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Courses ─────────────────────────────────────────── */}
        <Card className="rounded-xl border backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Your Courses
            </CardTitle>
            <Badge variant="outline">{courses.length} total</Badge>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  No courses yet.{" "}
                  <Link
                    href="/dashboard/create/new"
                    className="text-primary hover:underline"
                  >
                    Create your first course
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-border"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {course.courseName}
                        </h3>
                        {course.isPublic ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            <Globe className="mr-1 h-3 w-3" /> Public
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground"
                          >
                            <Lock className="mr-1 h-3 w-3" /> Not public
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {course.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {course.Module.length} modules
                        </span>
                        <span>
                          {course.Module.reduce(
                            (acc, m) => acc + m.Lesson.length,
                            0,
                          )}{" "}
                          lessons
                        </span>
                        <span>{formatDate(course.createdAt)}</span>
                      </div>

                      {/* Public URL or "Not public" label */}
                      {course.isPublic && course.shareSlug ? (
                        <Link
                          href={`/p/${course.shareSlug}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline break-all"
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          {appUrl}/p/{course.shareSlug}
                        </Link>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Not public
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="link" size="sm" asChild>
                        <Link href={`/p/${course.shareSlug ?? course.id}`}>View</Link>
                      </Button>
                      <ToggleCoursePublicButton
                        courseId={course.id}
                        isPublic={course.isPublic}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;

import { db } from "@/lib/prisma";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Creator roadmaps",
  robots: { index: false, follow: true },
};
export default async function CreatorPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const user = await db.user.findUnique({
    where: { subdomain: name },
    include: {
      Course: {
        where: { isPublic: true, shareSlug: { not: null } },
        select: {
          id: true,
          shareSlug: true,
          courseName: true,
          description: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user || effectiveAiPlan(user) === "FREE") notFound();
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">{user.name}’s roadmaps</h1>
      {user.Course.length === 0 && <p>No public roadmaps yet.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {user.Course.map((course) => (
          <Link
            className="space-y-2 rounded-xl border p-5"
            key={course.id}
            href={`/p/${course.shareSlug}`}
          >
            <h2 className="font-semibold">{course.courseName}</h2>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {course.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

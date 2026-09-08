import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.session.userId;
  const course = await db.course.findFirst({
    where: {
      id,
      OR: [
        { isPublic: true, shareSlug: { not: null } },
        ...(userId ? [{ userId }] : []),
      ],
    },
    select: { id: true, isPublic: true, shareSlug: true },
  });
  if (!course) notFound();
  redirect(`/p/${course.isPublic && course.shareSlug ? course.shareSlug : course.id}`);
}

import SingleOutline from "@/components/outline/SingleOutline";
import { db } from "@/lib/prisma";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      Module: {
        orderBy: { order: "asc" },
        include: {
          Lesson: {
            orderBy: { order: "asc" },
            include: {
              resources: true,
            },
          },
        },
      },
    },
  });

  if (!course) return <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">Course not found</div>;

  return <SingleOutline course={course} />;
}

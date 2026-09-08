import { auth } from "@/lib/auth";
import { getUserCourse } from "@/lib/course-cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CourseBuilder } from "@/components/CourseBuilder";
import type { CourseInitialData } from "@/components/CourseBuilder";

const EditCoursePage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const selectedCourse = await getUserCourse(session.session.userId, id);

  if (!selectedCourse) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-center text-center my-20">
        <h1 className="font-medium text-sm md:text-xl max-w-xs mx-auto md:w-full">
          Course with id <span className="text-primary px-2">{id}</span> not
          found!
        </h1>
      </div>
    );
  }

  const initialData: CourseInitialData = {
    courseId: selectedCourse.id,
    title: selectedCourse.courseName,
    description: selectedCourse.description,
    audience: selectedCourse.audience,
    isPublic: selectedCourse.isPublic,
    shareSlug: selectedCourse.shareSlug,
    modules: selectedCourse.Module.map((mod) => ({
      id: mod.id,
      name: mod.moduleName,
      description: mod.description,
      lessons: mod.Lesson.sort((a, b) => (a.order || 0) - (b.order || 0)).map(
        (lesson) => ({
          id: lesson.id,
          name: lesson.lessonName,
          description: "",
          resources: lesson.resources,
        }),
      ),
    })),
  };

  return <CourseBuilder initialData={initialData} />;
};

export default EditCoursePage;

import { CourseBuilder } from "@/components/CourseBuilder";
import type { CourseInitialData } from "@/components/CourseBuilder";
import { getExampleCourseTemplate } from "@/constants";

export default async function CreateCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template: templateId } = await searchParams;
  const template = getExampleCourseTemplate(templateId);

  const initialData: CourseInitialData | undefined = template
    ? {
        courseId: null,
        title: template.title,
        description: template.description,
        audience: template.audience,
        modules: template.modules.map((module, moduleIndex) => ({
          id: `template-module-${moduleIndex + 1}`,
          name: module.title,
          description: module.description,
          lessons: module.lessons.map((lesson, lessonIndex) => ({
            id: `template-lesson-${moduleIndex + 1}-${lessonIndex + 1}`,
            name: lesson,
            description: "",
            resources: [],
          })),
        })),
      }
    : undefined;

  return <CourseBuilder initialData={initialData} />;
}

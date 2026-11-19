"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCourseAction } from "@/lib/actions";
import { createCourseSchema } from "@/lib/validation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { IoSparklesSharp } from "react-icons/io5";
import { Course } from "@/app/generated/prisma/client";

interface CourseFormProps {
  errors?: Record<string, string>;
  courseData?: Course;
}

export default function EditCourseForm({
  errors,
  courseData,
}: CourseFormProps) {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setFormErrors({});

    const formData = new FormData(event.currentTarget);
    const data = {
      courseName: formData.get("courseName") as string,
      description: formData.get("description") as string,
    };

    const result = createCourseSchema.safeParse(data);
    if (!result.success) {
      const zodErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path.join(".");
        zodErrors[field] = issue.message;
      });
      setFormErrors(zodErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await createCourseAction(result.data);
      if (res.success) toast.success("Course Update!");
    } catch (err) {
      setFormErrors({ global: (err as Error).message });
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAIAssist = async () => {
    setAiLoading(true);
    setTimeout(() => {
      const titleInput = document.getElementById(
        "courseName",
      ) as HTMLInputElement;
      const descInput = document.getElementById(
        "description",
      ) as HTMLTextAreaElement;
      if (titleInput && descInput) {
        titleInput.value = "Next.js 15 Masterclass: From Zero to Production";
        descInput.value =
          "A complete course covering Server Actions, Server Components, and scalable full-stack development using Next.js 15.";
      }
      setAiLoading(false);
    }, 1500);
  };

  const mergedErrors = { ...errors, ...formErrors };

  return (
    <div className="w-full mt-8 space-y-6">
      <div className="flex flex-col text-left sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Edit Course</h2>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleAIAssist}
          disabled={aiLoading}
          className="gap-2 text-xs px-3 w-fit"
        >
          {aiLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <IoSparklesSharp className="h-3 w-3 text-primary-text" /> AI Assist
            </>
          )}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="">
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="courseName" className="text-sm font-medium">
                Course Title
              </FieldLabel>
              <Input
                id="courseName"
                name="courseName"
                autoComplete="off"
                placeholder="e.g., Mastering TypeScript for React Developers"
                className="text-sm"
                defaultValue={courseData ? courseData.courseName : ""}
              />
              {mergedErrors?.courseName && (
                <p className="text-xs text-destructive mt-1">
                  {mergedErrors.courseName}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel
                htmlFor="description"
                className="text-sm font-medium mb-1"
              >
                Description
              </FieldLabel>
              <Textarea
                id="description"
                name="description"
                autoComplete="off"
                className="text-sm min-h-[100px]"
                defaultValue={courseData ? courseData.description : ""}
                placeholder="Briefly describe what this course is about..."
              />
              {mergedErrors?.description && (
                <p className="text-xs text-destructive mt-1">
                  {mergedErrors.description}
                </p>
              )}
            </Field>

            {mergedErrors?.global && (
              <p className="text-xs text-destructive">{mergedErrors.global}</p>
            )}
          </FieldGroup>
        </FieldSet>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-5 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Update Course"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

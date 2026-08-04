import * as z from "zod";

// Schema for creating a course
export const createCourseSchema = z.object({
  courseName: z.string().min(1, "Course name is required"),
  description: z.string().min(1, "Description is required"),
});

// Schema for updating a course (all fields optional for partial updates)
export const updateCourseSchema = z.object({
  courseName: z.string().min(1, "Course name is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  isPublic: z.boolean().optional(),
  shareSlug: z.string().nullable().optional(),
});

export const moduleSchema = z.object({
  moduleName: z.string().min(1, "Module name is required"),
  description: z.string().min(1, "Description is required"),
  order: z.number().int().min(1, "Order is required"),
  courseId: z.string().uuid("Valid course ID is required"),
});

export const lessonSchema = z.object({
  lessonName: z.string().min(1, "Lesson name is required"),
  order: z.number().int().min(1, "Order is required"),
  moduleId: z.string().uuid("Valid module ID is required"),
});

// Bulk create modules schema (for creating multiple modules at once)
export const createModulesBulkSchema = z.object({
  courseId: z.string("Valid course ID is required"),
  modules: z
    .array(
      z.object({
        moduleName: z.string().min(1, "Module name is required"),
        description: z.string().min(1, "Description is required"),
        order: z.number().int().min(1, "Order must be at least 1"),
      })
    )
    .min(1, "At least one module is required"),
});

// Bulk create lessons schema (for creating multiple lessons at once)
export const createLessonsBulkSchema = z.object({
  moduleId: z.string("Valid Module ID is required"),
  lessons: z
    .array(
      z.object({
        lessonName: z.string().min(1, "Lesson name is required"),
        order: z.number().int().min(1, "Order must be at least 1"),
      })
    )
    .min(1, "At least one lesson is required"),
});

// Module update schema (for updating a single module)
export const updateModuleSchema = z.object({
  moduleName: z.string().min(1, "Module name is required"),
  description: z.string().min(1, "Description is required"),
  order: z.number().int().min(1, "Order must be at least 1"),
});

// Schema for updating the user's profile
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(60, "Name must be 60 characters or less"),
});

// Resource types — must match the Prisma ResourceType enum
const resourceTypes = ["Code", "PDF", "Link", "Note", "Image"] as const;

// Schema for creating a resource attached to a lesson
export const createResourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(resourceTypes, {
    error: "Type must be one of: Code, PDF, Link, Note, Image",
  }),
  meta: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  filename: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  size: z.number().int().nullable().optional(),
  lessonId: z.string().min(1, "Lesson ID is required"),
});

// Schema for updating a resource
export const updateResourceSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  meta: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  filename: z.string().nullable().optional(),
  contentType: z.string().nullable().optional(),
  size: z.number().int().nullable().optional(),
});

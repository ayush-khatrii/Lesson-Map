"use server";

import {
  createCourseSchema,
  createLessonsBulkSchema,
  createModulesBulkSchema,
  updateCourseSchema,
  updateLessonSchema,
  updateModuleSchema,
  updateProfileSchema,
} from "@/lib/validation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { userCoursesTag } from "@/lib/course-cache";
import z from "zod";
import { lockCourseOwner } from "@/lib/course-access";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { COURSE_LIMITS } from "@/lib/plans";

async function createCourseAction(data: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.session?.userId) {
    throw new Error("Unauthorized");
  }

  const userId = session.session.userId;

  const result = createCourseSchema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path.join(".");
      errors[field] = issue.message;
    });
    return { success: false, errors };
  }

  const creation = await db.$transaction(async (tx) => {
    const user = await lockCourseOwner(tx, userId);
    if (!user) throw new Error("Unauthorized");
    const plan = effectiveAiPlan(user);
    const courseLimit = COURSE_LIMITS[plan];
    const count = await tx.course.count({ where: { userId } });
    if (count >= courseLimit) return { course: null, courseLimit };
    const course = await tx.course.create({ data: { ...result.data, userId } });
    return { course, courseLimit };
  });

  if (!creation.course) {
    return {
      success: false,
      limitReached: true,
      message: `You've reached your plan limit of ${creation.courseLimit} courses.`,
    };
  }

  updateTag(userCoursesTag(userId));
  revalidatePath("/dashboard/create/new");

  return { success: true, data: creation.course };
}

// createModulesAction
async function createModulesAction(data: unknown) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.session.userId;

    if (!userId) {
      throw new Error("Unauthorized: Please log in to continue.");
    }
    const result = createModulesBulkSchema.safeParse(data);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path.join(".");
        errors[field] = issue.message;
      });
      return { success: false, errors };
    }

    const { courseId, modules } = result.data;
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        userId,
      },
    });

    if (!course) {
      throw new Error("Invalid course. You do not own this course.");
    }

    const created = await db.module.createManyAndReturn({
      data: modules.map((m) => ({
        moduleName: m.moduleName,
        description: m.description,
        order: m.order,
        courseId: courseId,
      })),
    });

    updateTag(userCoursesTag(userId));
    revalidatePath("/dashboard/create/new");
    revalidatePath("/");

    return {
      success: true,
      data: created,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        const field = issue.path.join(".");
        errors[field] = issue.message;
      });
      return { success: false, errors };
    }
    return {
      success: false,
      error:
        (error as Error).message ||
        "Something went wrong while creating modules.",
    };
  }
}

// ccreateLessonsAction
async function createLessonsAction(data: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session.userId;

    if (!userId) {
      throw new Error("Unauthorized: Please log in to continue.");
    }

    const result = createLessonsBulkSchema.safeParse(data);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path.join(".");
        errors[field] = issue.message;
      });
      return { success: false, errors };
    }

    const { moduleId, lessons } = result.data;

    const module = await db.module.findFirst({
      where: {
        id: moduleId,
        course: { userId },
      },
    });

    if (!module) {
      throw new Error("Module not found or not owned by user.");
    }

    const created = await db.lesson.createManyAndReturn({
      data: lessons.map((l) => ({
        moduleId,
        lessonName: l.lessonName,
        order: l.order,
      })),
    });

    updateTag(userCoursesTag(userId));
    revalidatePath("/dashboard/create/new");
    revalidatePath("/");
    return {
      success: true,
      data: created,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        const field = issue.path.join(".");
        errors[field] = issue.message;
      });
      return { success: false, errors };
    }
    return {
      success: false,
      error:
        (error as Error).message ||
        "Something went wrong while creating lessons.",
    };
  }
}
async function reorderModulesAction(courseId: string, moduleIds: string[]) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session.userId;

    if (!userId) {
      throw new Error("Unauthorized: Please log in to continue.");
    }

    const course = await db.course.findFirst({
      where: { id: courseId, userId },
    });

    if (!course) {
      throw new Error("Course not found or not owned by user.");
    }

    await db.$transaction(async (tx) => {
      const ownedModules = await tx.module.findMany({
        where: { courseId, course: { userId } },
        select: { id: true },
      });
      const ownedIds = new Set(ownedModules.map((module) => module.id));
      if (
        moduleIds.length !== ownedModules.length ||
        new Set(moduleIds).size !== moduleIds.length ||
        moduleIds.some((id) => !ownedIds.has(id))
      ) {
        throw new Error("Invalid module order for this course.");
      }
      await Promise.all(
        moduleIds.map((id, index) =>
          tx.module.update({ where: { id }, data: { order: index + 1 } }),
        ),
      );
    });

    updateTag(userCoursesTag(userId));
    revalidatePath(`/dashboard/${courseId}/edit`);
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: true, message: "Modules reordered successfully!" };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Failed to reorder modules.",
    };
  }
}

// updateProfileAction
async function updateProfileAction(data: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session?.userId;

    if (!userId) {
      throw new Error("Unauthorized: Please log in to continue.");
    }

    const result = updateProfileSchema.safeParse(data);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path.join(".");
        errors[field] = issue.message;
      });
      return { success: false, errors };
    }

    // Update the user via better-auth so the session cookie stays in sync
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: result.data.name,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return { success: true, message: "Profile updated successfully!" };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Failed to update profile.",
    };
  }
}

// updateCourseAction
async function updateCourseAction(courseId: string, data: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session?.userId;

    if (!userId) {
      throw new Error("Unauthorized: Please log in to continue.");
    }

    const result = updateCourseSchema.safeParse(data);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path.join(".");
        errors[field] = issue.message;
      });
      return { success: false, errors };
    }

    const course = await db.course.findFirst({
      where: { id: courseId, userId },
    });

    if (!course) {
      throw new Error("Course not found or not owned by user.");
    }

    const updated = await db.course.update({
      where: { id: courseId },
      data: {
        courseName: result.data.courseName,
        description: result.data.description,
      },
    });

    updateTag(userCoursesTag(userId));
    revalidatePath(`/dashboard/${courseId}/edit`);
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Failed to update course.",
    };
  }
}

// deleteCourseAction
async function deleteCourseAction(courseId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session?.userId;

    if (!userId) {
      throw new Error("Unauthorized: Please log in to continue.");
    }

    const deleted = await db.course.deleteMany({
      where: { id: courseId, userId },
    });

    if (deleted.count === 0) {
      throw new Error("Course not found or not owned by user.");
    }

    updateTag(userCoursesTag(userId));
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    return { success: true, message: "Course deleted successfully!" };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Failed to delete course.",
    };
  }
}

// reorderLessonsAction
async function reorderLessonsAction(moduleId: string, lessonIds: string[]) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session?.userId;

    if (!userId) {
      throw new Error("Unauthorized: Please log in to continue.");
    }

    const module = await db.module.findFirst({
      where: { id: moduleId, course: { userId } },
    });

    if (!module) {
      throw new Error("Module not found or not owned by user.");
    }

    await db.$transaction(async (tx) => {
      const ownedLessons = await tx.lesson.findMany({
        where: { moduleId, module: { course: { userId } } },
        select: { id: true },
      });
      const ownedIds = new Set(ownedLessons.map((lesson) => lesson.id));
      if (
        lessonIds.length !== ownedLessons.length ||
        new Set(lessonIds).size !== lessonIds.length ||
        lessonIds.some((id) => !ownedIds.has(id))
      ) {
        throw new Error("Invalid lesson order for this module.");
      }
      await Promise.all(
        lessonIds.map((id, index) =>
          tx.lesson.update({ where: { id }, data: { order: index + 1 } }),
        ),
      );
    });

    updateTag(userCoursesTag(userId));
    revalidatePath(`/dashboard/${module.courseId}/edit`);
    revalidatePath("/dashboard");

    return { success: true, message: "Lessons reordered successfully!" };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Failed to reorder lessons.",
    };
  }
}

function fieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    errors[issue.path.join(".")] = issue.message;
  });
  return errors;
}

async function updateModuleAction(moduleId: string, data: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session?.userId;
    if (!userId) throw new Error("Unauthorized: Please log in to continue.");

    const result = updateModuleSchema.safeParse(data);
    if (!result.success) return { success: false, errors: fieldErrors(result.error) };

    const module = await db.module.findFirst({
      where: { id: moduleId, course: { userId } },
      select: { id: true, courseId: true },
    });
    if (!module) throw new Error("Module not found or not owned by user.");

    const updated = await db.module.update({ where: { id: moduleId }, data: result.data });
    updateTag(userCoursesTag(userId));
    revalidatePath(`/dashboard/${module.courseId}/edit`);
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: (error as Error).message || "Failed to update module." };
  }
}

async function deleteModuleAction(moduleId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session?.userId;
    if (!userId) throw new Error("Unauthorized: Please log in to continue.");

    const module = await db.module.findFirst({
      where: { id: moduleId, course: { userId } },
      select: { id: true, courseId: true },
    });
    if (!module) throw new Error("Module not found or not owned by user.");
    await db.module.delete({ where: { id: module.id } });
    updateTag(userCoursesTag(userId));
    revalidatePath(`/dashboard/${module.courseId}/edit`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message || "Failed to delete module." };
  }
}

async function updateLessonAction(lessonId: string, data: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session?.userId;
    if (!userId) throw new Error("Unauthorized: Please log in to continue.");

    const result = updateLessonSchema.safeParse(data);
    if (!result.success) return { success: false, errors: fieldErrors(result.error) };

    const lesson = await db.lesson.findFirst({
      where: { id: lessonId, module: { course: { userId } } },
      select: { id: true, module: { select: { courseId: true } } },
    });
    if (!lesson) throw new Error("Lesson not found or not owned by user.");

    const updated = await db.lesson.update({ where: { id: lessonId }, data: result.data });
    updateTag(userCoursesTag(userId));
    revalidatePath(`/dashboard/${lesson.module.courseId}/edit`);
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: (error as Error).message || "Failed to update lesson." };
  }
}

async function deleteLessonAction(lessonId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session?.userId;
    if (!userId) throw new Error("Unauthorized: Please log in to continue.");

    const lesson = await db.lesson.findFirst({
      where: { id: lessonId, module: { course: { userId } } },
      select: { id: true, module: { select: { courseId: true } } },
    });
    if (!lesson) throw new Error("Lesson not found or not owned by user.");
    await db.lesson.delete({ where: { id: lesson.id } });
    updateTag(userCoursesTag(userId));
    revalidatePath(`/dashboard/${lesson.module.courseId}/edit`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message || "Failed to delete lesson." };
  }
}

export {
  createCourseAction,
  createModulesAction,
  createLessonsAction,
  reorderModulesAction,
  updateProfileAction,
  updateCourseAction,
  deleteCourseAction,
  reorderLessonsAction,
  updateModuleAction,
  deleteModuleAction,
  updateLessonAction,
  deleteLessonAction,
};

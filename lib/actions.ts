"use server";

import {
  createCourseSchema,
  createLessonsBulkSchema,
  createModulesBulkSchema,
  updateCourseSchema,
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

    // Update orders in a transaction
    await db.$transaction(
      moduleIds.map((id, index) =>
        db.module.update({
          where: { id },
          data: { order: index },
        })
      )
    );

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
    updateTag(userCoursesTag(userId));
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

    // Update lesson orders in a transaction
    await db.$transaction(
      lessonIds.map((id, index) =>
        db.lesson.update({
          where: { id },
          data: { order: index },
        })
      )
    );

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

export {
  createCourseAction,
  createModulesAction,
  createLessonsAction,
  reorderModulesAction,
  updateProfileAction,
  updateCourseAction,
  deleteCourseAction,
  reorderLessonsAction,
};

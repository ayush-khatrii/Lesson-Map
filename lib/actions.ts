"use server";

import {
  createCourseSchema,
  createLessonsBulkSchema,
  createModulesBulkSchema,
  updateCourseSchema,
} from "@/lib/validation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { userCoursesTag } from "@/lib/course-cache";
import z from "zod";

async function createCourseAction(data: unknown) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.session?.userId) {
    throw new Error("Unauthorized");
  }

  const userId = session.session.userId;

  // Fetch user plan and current course count
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const courseCount = await db.course.count({
    where: { userId },
  });

  // Limit check
  if (user?.plan === "FREE" && courseCount >= 3) {
    return {
      success: false,
      limitReached: true,
      message: "You've reached the limit of 3 courses on the Free plan. Please upgrade to create more!",
    };
  }

  const result = createCourseSchema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path.join(".");
      errors[field] = issue.message;
    });
    return { success: false, errors };
  }

  const course = await db.course.create({
    data: {
      courseName: result.data.courseName,
      description: result.data.description,
      userId: userId,
    },
  });

  updateTag(userCoursesTag(userId));
  revalidatePath("/dashboard/create/new");

  return { success: true, data: course };
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

    const created = await db.$transaction(
      modules.map((m) =>
        db.module.create({
          data: {
            moduleName: m.moduleName,
            description: m.description,
            order: m.order,
            courseId: courseId,
          },
        }),
      ),
    );

    updateTag(userCoursesTag(userId));
    revalidatePath("/dashboard/create/new");
    revalidatePath("/");

    return {
      success: true,
      message: "Modules created successfully!",
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

    const createdLessons = await db.$transaction(
      lessons.map((l) =>
        db.lesson.create({
          data: {
            moduleId,
            lessonName: l.lessonName,
            order: l.order,
          },
        }),
      ),
    );

    updateTag(userCoursesTag(userId));
    revalidatePath("/dashboard/create/new");
    revalidatePath("/");
    return {
      success: true,
      message: "Lessons created successfully!",
      data: createdLessons,
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
        }),
      ),
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

async function reorderLessonsAction(moduleId: string, lessonIds: string[]) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session.userId;

    if (!userId) {
      throw new Error("Unauthorized: Please log in to continue.");
    }

    const module = await db.module.findFirst({
      where: { id: moduleId, course: { userId } },
    });

    if (!module) {
      throw new Error("Module not found or not owned by user.");
    }

    await db.$transaction(
      lessonIds.map((id, index) =>
        db.lesson.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    updateTag(userCoursesTag(userId));
    revalidatePath("/dashboard/create/new");
    revalidatePath("/");

    return { success: true, message: "Lessons reordered successfully!" };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Failed to reorder lessons.",
    };
  }
}

async function updateCourseAction(courseId: string, data: unknown) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session.userId;

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
    revalidatePath("/dashboard/create/new");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Failed to update course.",
    };
  }
}

async function deleteCourseAction(courseId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session.userId;

    if (!userId) {
      throw new Error("Unauthorized: Please log in to continue.");
    }

    const course = await db.course.findFirst({
      where: { id: courseId, userId },
      include: { Module: { include: { Lesson: true } } },
    });

    if (!course) {
      throw new Error("Course not found or not owned by user.");
    }

    // Delete in order: lessons → modules → course
    await db.$transaction([
      ...course.Module.flatMap((m) =>
        m.Lesson.map((l) => db.lesson.delete({ where: { id: l.id } })),
      ),
      ...course.Module.map((m) => db.module.delete({ where: { id: m.id } })),
      db.course.delete({ where: { id: courseId } }),
    ]);

    updateTag(userCoursesTag(userId));
    revalidatePath("/dashboard/create/new");
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: true, message: "Course deleted permanently." };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Failed to delete course.",
    };
  }
}

export {
  createCourseAction,
  createModulesAction,
  createLessonsAction,
  reorderModulesAction,
  reorderLessonsAction,
  updateCourseAction,
  deleteCourseAction,
};

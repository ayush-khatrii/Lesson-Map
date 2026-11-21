import type { Prisma } from "@/app/generated/prisma/client";
import type { fetchPlaylist } from "@/lib/youtube";

export async function createYouTubeCourse(
  tx: Prisma.TransactionClient,
  userId: string,
  playlist: Awaited<ReturnType<typeof fetchPlaylist>>,
  onStage?: (stage: string) => void,
) {
  onStage?.("create_course");
  const course = await tx.course.create({
    data: {
      userId,
      courseName: playlist.title,
      description: playlist.description || "Imported from YouTube",
    },
  });
  onStage?.("create_module");
  const module = await tx.module.create({
    data: {
      courseId: course.id,
      moduleName: playlist.title,
      description: "YouTube playlist",
      order: 1,
    },
  });
  const lessons = playlist.videos.map((video, index) => ({
    id: crypto.randomUUID(),
    moduleId: module.id,
    lessonName: video.title,
    description: video.description,
    videoDurationSeconds: video.videoDurationSeconds ?? null,
    order: index + 1,
  }));
  // Explicit ordering ensures every referenced lesson exists before resources
  // are inserted. The caller owns the transaction, including import accounting.
  onStage?.("create_lessons");
  await tx.lesson.createMany({ data: lessons });
  onStage?.("create_resources");
  await tx.resource.createMany({
    data: playlist.videos.map((video, index) => ({
      lessonId: lessons[index].id,
      name: "Watch on YouTube",
      type: "Link",
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
    })),
  });
  return course;
}

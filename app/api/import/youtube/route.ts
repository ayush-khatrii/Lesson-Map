import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { sessionUserId, allowRequest, launchError } from "@/lib/launch-access";
import { lockCourseOwner } from "@/lib/course-access";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { COURSE_LIMITS, hasReachedCourseLimit } from "@/lib/plans";
import {
  fetchPlaylist,
  playlistIdFromUrl,
  YouTubeImportError,
} from "@/lib/youtube";
import { revalidateTag } from "next/cache";
import { userCoursesTag } from "@/lib/course-cache";
import { isSameOriginRequest } from "@/lib/payments/request-security";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request))
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    const userId = await sessionUserId();
    if (!userId)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const input = z
      .object({ url: z.string().max(2000), requestId: z.string().uuid() })
      .safeParse(await request.json().catch(() => null));
    if (!input.success)
      return NextResponse.json(
        { error: "Enter a playlist URL." },
        { status: 400 },
      );
    let playlistId: string;
    try {
      playlistId = playlistIdFromUrl(input.data.url);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
    const previous = await db.playlistImport.findUnique({
      where: { userId_requestId: { userId, requestId: input.data.requestId } },
    });
    if (previous)
      return previous.playlistId === playlistId
        ? NextResponse.json({ courseId: previous.courseId, skipped: 0 })
        : NextResponse.json(
            { error: "Start a new import for a different playlist." },
            { status: 409 },
          );
    if (!(await allowRequest(`youtube:${userId}`, 5)))
      return NextResponse.json(
        { error: "Please wait a minute before importing again." },
        { status: 429 },
      );
    const owner = await db.user.findUnique({ where: { id: userId } });
    if (!owner)
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    if (effectiveAiPlan(owner) === "FREE" && owner.youtubeImports >= 1)
      return NextResponse.json(
        {
          error:
            "Your free playlist import has been used. Upgrade to Creator to import more.",
        },
        { status: 403 },
      );
    if (
      hasReachedCourseLimit(
        await db.course.count({ where: { userId } }),
        COURSE_LIMITS[effectiveAiPlan(owner)],
      )
    ) {
      return NextResponse.json(
        { error: "Your course limit has been reached." },
        { status: 403 },
      );
    }
    let playlist;
    try {
      playlist = await fetchPlaylist(playlistId);
    } catch (error) {
      if (!(error instanceof YouTubeImportError)) throw error;
      console.error("YouTube import failed", {
        requestId: input.data.requestId,
        code: error.code,
        status: error.status,
      });
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          requestId: input.data.requestId,
        },
        { status: error.status },
      );
    }
    const result = await db.$transaction(async (tx) => {
      const user = await lockCourseOwner(tx, userId);
      if (!user) return { error: "User not found." };
      const existing = await tx.playlistImport.findUnique({
        where: {
          userId_requestId: { userId, requestId: input.data.requestId },
        },
      });
      if (existing)
        return existing.playlistId === playlistId
          ? { courseId: existing.courseId }
          : { error: "Start a new import." };
      const usage = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const plan = effectiveAiPlan(user);
      if (plan === "FREE" && usage.youtubeImports >= 1)
        return { error: "Your free playlist import has been used." };
      if (
        hasReachedCourseLimit(
          await tx.course.count({ where: { userId } }),
          COURSE_LIMITS[plan],
        )
      )
        return { error: "Your course limit has been reached." };
      const course = await tx.course.create({
        data: {
          userId,
          courseName: playlist.title,
          description: playlist.description || "Imported from YouTube",
          Module: {
            create: {
              moduleName: playlist.title,
              description: "YouTube playlist",
              order: 1,
              Lesson: {
                create: playlist.videos.map((video, index) => ({
                  lessonName: video.title,
                  description: video.description,
                  order: index + 1,
                  resources: {
                    create: {
                      name: "Watch on YouTube",
                      type: "Link",
                      url: `https://www.youtube.com/watch?v=${video.videoId}`,
                    },
                  },
                })),
              },
            },
          },
        },
      });
      await tx.playlistImport.create({
        data: {
          userId,
          requestId: input.data.requestId,
          playlistId,
          courseId: course.id,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { youtubeImports: { increment: 1 } },
      });
      return { courseId: course.id };
    });
    if ("error" in result) return NextResponse.json(result, { status: 403 });
    revalidateTag(userCoursesTag(userId), { expire: 0 });
    return NextResponse.json({ ...result, skipped: playlist.skipped });
  } catch (error) {
    return launchError(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { sessionUserId, allowRequest, launchError } from "@/lib/launch-access";
import { createYouTubeCourse } from "@/lib/youtube-course";
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
  let requestId: string = crypto.randomUUID();
  let stage = "authenticate";
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
    requestId = input.data.requestId;
    let playlistId: string;
    try {
      playlistId = playlistIdFromUrl(input.data.url);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
    stage = "check_previous_import";
    const previous = await db.playlistImport.findUnique({
      where: { userId_requestId: { userId, requestId: input.data.requestId } },
    });
    if (previous)
      return previous.playlistId === playlistId
        ? NextResponse.json({
            courseId: previous.courseId,
            skipped: 0,
            missingDurationCount: await db.lesson.count({
              where: {
                module: { courseId: previous.courseId },
                videoDurationSeconds: null,
              },
            }),
          })
        : NextResponse.json(
            { error: "Start a new import for a different playlist." },
            { status: 409 },
          );
    stage = "check_rate_limit";
    if (!(await allowRequest(`youtube:${userId}`, 5)))
      return NextResponse.json(
        { error: "Please wait a minute before importing again." },
        { status: 429 },
      );
    stage = "check_course_allowance";
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
    stage = "fetch_youtube_playlist";
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
    stage = "save_course";
    const result = await db.$transaction(
      async (tx) => {
        stage = "lock_course_owner";
        const user = await lockCourseOwner(tx, userId);
        if (!user) return { error: "User not found." };
        stage = "check_locked_import_replay";
        const existing = await tx.playlistImport.findUnique({
          where: {
            userId_requestId: { userId, requestId: input.data.requestId },
          },
        });
        if (existing)
          return existing.playlistId === playlistId
            ? {
                courseId: existing.courseId,
                missingDurationCount: await tx.lesson.count({
                  where: {
                    module: { courseId: existing.courseId },
                    videoDurationSeconds: null,
                  },
                }),
              }
            : { error: "Start a new import." };
        stage = "check_locked_course_allowance";
        const usage = await tx.user.findUniqueOrThrow({
          where: { id: userId },
        });
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
        const course = await createYouTubeCourse(
          tx,
          userId,
          playlist,
          (value) => {
            stage = value;
          },
        );
        stage = "record_import";
        await tx.playlistImport.create({
          data: {
            userId,
            requestId: input.data.requestId,
            playlistId,
            courseId: course.id,
          },
        });
        stage = "increment_import_usage";
        await tx.user.update({
          where: { id: userId },
          data: { youtubeImports: { increment: 1 } },
        });
        stage = "commit_import";
        return {
          courseId: course.id,
          missingDurationCount: playlist.videos.filter(
            (video) => !video.videoDurationSeconds,
          ).length,
        };
      },
      { timeout: 30000 },
    );
    if ("error" in result) return NextResponse.json(result, { status: 403 });
    // The import is committed. Cache invalidation must not report it as failed.
    try {
      revalidateTag(userCoursesTag(userId), { expire: 0 });
    } catch {
      console.error("YouTube import cache refresh failed", { requestId });
    }
    return NextResponse.json({ ...result, skipped: playlist.skipped });
  } catch (error) {
    return launchError(error, { requestId, stage });
  }
}

export const MAX_LESSON_SECONDS = 2_147_483_647;

export interface LessonTiming {
  estimatedCompletionSeconds?: number | null;
  videoDurationSeconds?: number | null;
}

export interface LessonTimeValues {
  estimatedCompletionSeconds: number | null;
  videoDurationSeconds: number | null;
}

export interface TimeSummary extends LessonTimeValues {
  lessonCount: number;
  estimatedCompletionCount: number;
  videoDurationCount: number;
}

export function validLessonSeconds(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_LESSON_SECONDS
  );
}

export function summarizeLessonTimes(
  lessons: readonly LessonTiming[],
): TimeSummary {
  const summary: TimeSummary = {
    estimatedCompletionSeconds: null,
    videoDurationSeconds: null,
    lessonCount: lessons.length,
    estimatedCompletionCount: 0,
    videoDurationCount: 0,
  };
  for (const lesson of lessons) {
    if (validLessonSeconds(lesson.estimatedCompletionSeconds)) {
      summary.estimatedCompletionSeconds =
        (summary.estimatedCompletionSeconds ?? 0) +
        lesson.estimatedCompletionSeconds;
      summary.estimatedCompletionCount++;
    }
    if (validLessonSeconds(lesson.videoDurationSeconds)) {
      summary.videoDurationSeconds =
        (summary.videoDurationSeconds ?? 0) + lesson.videoDurationSeconds;
      summary.videoDurationCount++;
    }
  }
  return summary;
}

// Round estimates only for display, after summing. Video lengths keep seconds.
export function formatDuration(seconds: number, wholeMinutes = false): string {
  const value = wholeMinutes ? Math.ceil(seconds / 60) * 60 : seconds;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = value % 60;
  return (
    [
      hours ? `${hours} hr` : "",
      minutes ? `${minutes} min` : "",
      remainder ? `${remainder} sec` : "",
    ]
      .filter(Boolean)
      .join(" ") || "0 min"
  );
}

export function lessonTimingLines(lesson: LessonTiming): string[] {
  const lines: string[] = [];
  if (validLessonSeconds(lesson.estimatedCompletionSeconds))
    lines.push(
      `${formatDuration(lesson.estimatedCompletionSeconds, true)} estimated`,
    );
  if (validLessonSeconds(lesson.videoDurationSeconds))
    lines.push(`${formatDuration(lesson.videoDurationSeconds)} video`);
  return lines;
}

export function timingSummaryLines(summary: TimeSummary): string[] {
  const coverage = (count: number) =>
    count < summary.lessonCount
      ? ` · provided time for ${count} of ${summary.lessonCount} lessons`
      : "";
  const lines: string[] = [];
  if (summary.estimatedCompletionSeconds !== null)
    lines.push(
      `${formatDuration(summary.estimatedCompletionSeconds, true)} estimated${coverage(summary.estimatedCompletionCount)}`,
    );
  if (summary.videoDurationSeconds !== null)
    lines.push(
      `${formatDuration(summary.videoDurationSeconds)} video${coverage(summary.videoDurationCount)}`,
    );
  return lines;
}

/** YouTube durations use day/hour/minute/second ISO 8601 components. */
export function parseVideoDuration(value: unknown): number | null {
  if (typeof value !== "string" || value.endsWith("T")) return null;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    value,
  );
  if (!match) return null;
  const seconds =
    Number(match[1] ?? 0) * 86400 +
    Number(match[2] ?? 0) * 3600 +
    Number(match[3] ?? 0) * 60 +
    Number(match[4] ?? 0);
  return validLessonSeconds(seconds) ? seconds : null;
}

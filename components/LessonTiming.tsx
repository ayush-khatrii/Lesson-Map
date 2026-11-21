import {
  lessonTimingLines,
  summarizeLessonTimes,
  timingSummaryLines,
  type LessonTiming,
} from "@/lib/lesson-time";

export function LessonTime({
  lesson,
  showUnset = false,
}: {
  lesson: LessonTiming;
  showUnset?: boolean;
}) {
  const text = lessonTimingLines(lesson).join(" · ");
  return text || showUnset ? (
    <span className="mt-1 block text-xs font-normal text-muted-foreground">
      {text || "Time not set"}
    </span>
  ) : null;
}

export function TotalTime({
  lessons,
  className = "",
}: {
  lessons: readonly LessonTiming[];
  className?: string;
}) {
  const lines = timingSummaryLines(summarizeLessonTimes(lessons));
  return lines.length ? (
    <span
      className={`mt-1 block text-xs font-normal text-muted-foreground ${className}`}
    >
      {lines.map((line) => (
        <span className="block" key={line}>
          {line}
        </span>
      ))}
    </span>
  ) : null;
}

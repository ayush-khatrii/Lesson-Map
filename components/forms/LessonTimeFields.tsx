"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_LESSON_SECONDS,
  validLessonSeconds,
  type LessonTimeValues,
} from "@/lib/lesson-time";

export interface TimeFieldValues {
  completionMinutes: string;
  videoHours: string;
  videoMinutes: string;
  videoSeconds: string;
}

export function timeFieldValues(
  timing: Partial<LessonTimeValues> = {},
): TimeFieldValues {
  const video = timing.videoDurationSeconds;
  return {
    completionMinutes: timing.estimatedCompletionSeconds
      ? String(
          Math.min(
            Math.ceil(timing.estimatedCompletionSeconds / 60),
            Math.floor(MAX_LESSON_SECONDS / 60),
          ),
        )
      : "",
    videoHours: video ? String(Math.floor(video / 3600)) : "",
    videoMinutes: video ? String(Math.floor((video % 3600) / 60)) : "",
    videoSeconds: video ? String(video % 60) : "",
  };
}

export function readTimeFields(
  fields: TimeFieldValues,
): LessonTimeValues | null {
  const integer = (value: string) => value === "" || /^\d+$/.test(value);
  if (!Object.values(fields).every(integer)) return null;
  const estimatedCompletionSeconds =
    fields.completionMinutes === ""
      ? null
      : Number(fields.completionMinutes) * 60;
  const hasVideo = [
    fields.videoHours,
    fields.videoMinutes,
    fields.videoSeconds,
  ].some((value) => value !== "");
  const videoDurationSeconds = hasVideo
    ? Number(fields.videoHours) * 3600 +
      Number(fields.videoMinutes) * 60 +
      Number(fields.videoSeconds)
    : null;
  if (Number(fields.videoMinutes) > 59 || Number(fields.videoSeconds) > 59)
    return null;
  if (
    estimatedCompletionSeconds !== null &&
    !validLessonSeconds(estimatedCompletionSeconds)
  )
    return null;
  if (
    videoDurationSeconds !== null &&
    !validLessonSeconds(videoDurationSeconds)
  )
    return null;
  return { estimatedCompletionSeconds, videoDurationSeconds };
}

export function LessonTimeFields({
  value,
  onChange,
  disabled,
}: {
  value: TimeFieldValues;
  onChange: (value: TimeFieldValues) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const parsed = readTimeFields(value);
  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-completion`}>
          Estimated time to complete (minutes)
        </Label>
        <Input
          id={`${id}-completion`}
          type="number"
          min={1}
          max={Math.floor(MAX_LESSON_SECONDS / 60)}
          step={1}
          value={value.completionMinutes}
          onChange={(event) =>
            onChange({ ...value, completionMinutes: event.target.value })
          }
          placeholder="Optional, e.g. 30"
          aria-describedby={`${id}-completion-help`}
        />
        <p
          id={`${id}-completion-help`}
          className="text-xs text-muted-foreground"
        >
          Include videos, reading, and practice.
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Video duration (optional)</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["videoHours", "Hours", Math.floor(MAX_LESSON_SECONDS / 3600)],
              ["videoMinutes", "Minutes", 59],
              ["videoSeconds", "Seconds", 59],
            ] as const
          ).map(([key, label, max]) => (
            <div key={key} className="space-y-1">
              <Label
                htmlFor={`${id}-${key}`}
                className="text-xs text-muted-foreground"
              >
                {label}
              </Label>
              <Input
                id={`${id}-${key}`}
                type="number"
                min={0}
                max={max}
                step={1}
                placeholder="0"
                value={value[key]}
                onChange={(event) =>
                  onChange({ ...value, [key]: event.target.value })
                }
                aria-describedby={`${id}-video-help`}
              />
            </div>
          ))}
        </div>
        <p id={`${id}-video-help`} className="text-xs text-muted-foreground">
          Enter the combined length shown by your video hosting platform. Clear
          all three boxes to remove it.
        </p>
      </div>
      {!parsed && (
        <p role="alert" className="text-xs text-destructive">
          Enter positive whole times, with minutes and seconds between 0 and 59
          for video duration.
        </p>
      )}
      {parsed?.estimatedCompletionSeconds &&
      parsed.videoDurationSeconds &&
      parsed.estimatedCompletionSeconds < parsed.videoDurationSeconds ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Your completion estimate is shorter than the video duration. Check
          that it includes watching time.
        </p>
      ) : null}
    </fieldset>
  );
}

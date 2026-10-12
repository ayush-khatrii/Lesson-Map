import test from "node:test";
import assert from "node:assert/strict";

import { reviseCourseSchema } from "../lib/ai/schema";
import {
  reviseLessonMessages,
  reviseOutlineMessages,
  type CurrentCourseContext,
} from "../lib/ai/deepseek";

const requestId = "11111111-1111-4111-8111-111111111111";

const input = {
  requestId,
  courseId: "course-1",
  instructions: "make it simpler for absolute beginners",
  moduleCount: 4,
  lessonsPerModule: 3,
  rewriteMeta: false,
};

const current: CurrentCourseContext = {
  title: "Intro to X",
  description: "A short description that is long enough to be valid here.",
  audience: "beginners",
  modules: [
    { moduleName: "Foundations", description: "basics", lessons: ["A", "B"] },
  ],
};

test("reviseCourseSchema defaults rewriteMeta to false and rejects blank instructions", () => {
  const parsed = reviseCourseSchema.safeParse(input);
  assert.equal(parsed.success, true);
  assert.equal(parsed.success && parsed.data.rewriteMeta, false);

  const blank = reviseCourseSchema.safeParse({ ...input, instructions: "  " });
  assert.equal(blank.success, false);
});

test("revise outline prompt carries the instructions, current outline and target size", () => {
  const [system, user] = reviseOutlineMessages(input, current);
  assert.match(String(system.content), /exactly 4 modules/i);
  const message = String(user.content);
  assert.match(message, /make it simpler for absolute beginners/);
  assert.match(message, /Foundations/);
  assert.match(message, /Foundations|Intro to X/);
});

test("revise lesson prompt requests the exact lesson count per module", () => {
  const [system] = reviseLessonMessages(input, [
    { moduleName: "Foundations", description: "basics" },
  ]);
  assert.match(String(system.content), /exactly 3 lesson objects/i);
});

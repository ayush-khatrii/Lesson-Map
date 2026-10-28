import test from "node:test";
import assert from "node:assert/strict";
import { COURSE_LIMITS, hasReachedCourseLimit } from "../lib/plans";

test("course limits enforce the Free cap and leave paid plans unlimited", () => {
  assert.equal(hasReachedCourseLimit(2, COURSE_LIMITS.FREE), false);
  assert.equal(hasReachedCourseLimit(3, COURSE_LIMITS.FREE), true);
  assert.equal(hasReachedCourseLimit(3, COURSE_LIMITS.CREATOR), false);
  assert.equal(hasReachedCourseLimit(10_000, COURSE_LIMITS.PROFESSIONAL), false);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  courseActionFailure,
  courseActionDiagnostics,
} from "../lib/course-action-error";

test("database errors explain recovery without exposing database details", () => {
  for (const [databaseCode, code, status] of [
    ["P2021", "COURSE_DATABASE_SCHEMA", 503],
    ["P2022", "COURSE_DATABASE_SCHEMA", 503],
    ["P2003", "COURSE_RELATIONSHIP_FAILED", 500],
    ["P2028", "COURSE_TRANSACTION_FAILED", 503],
    ["P1001", "COURSE_DATABASE_UNAVAILABLE", 503],
    ["P2024", "COURSE_DATABASE_UNAVAILABLE", 503],
    ["P2002", "COURSE_WRITE_CONFLICT", 409],
    ["P2034", "COURSE_WRITE_CONFLICT", 409],
  ] as const) {
    const failure = courseActionFailure({
      code: databaseCode,
      message: "secret connection string",
    });
    assert.equal(failure.code, code);
    assert.equal(failure.status, status);
    assert.ok(!JSON.stringify(failure).includes("secret"));
  }
  for (const error of [
    null,
    undefined,
    new Error("secret"),
    { code: "unknown" },
  ]) {
    assert.equal(courseActionFailure(error).code, "COURSE_IMPORT_FAILED");
    assert.ok(!JSON.stringify(courseActionFailure(error)).includes("secret"));
  }
});

test("diagnostics allowlist Prisma codes and known constraint names", () => {
  const meta = {
    driverAdapterError: {
      cause: { constraint: { index: "Resource_lessonId_fkey" } },
    },
  };
  assert.deepEqual(
    courseActionDiagnostics({
      code: "P2003",
      meta,
      message: "secret",
      name: "secret",
    }),
    {
      databaseCode: "P2003",
      constraint: "Resource_lessonId_fkey",
    },
  );
  assert.equal(
    courseActionDiagnostics({ meta: { constraint: "Lesson_moduleId_fkey" } })
      .constraint,
    "Lesson_moduleId_fkey",
  );
  assert.deepEqual(
    courseActionDiagnostics({ code: "secret", meta: { constraint: "secret" } }),
    {
      databaseCode: undefined,
      constraint: undefined,
    },
  );
  assert.deepEqual(courseActionDiagnostics(null), {
    databaseCode: undefined,
    constraint: undefined,
  });
});

// Only known identifiers may enter logs. Never inspect the raw error message,
// which can contain SQL parameters, credentials, or connection details.
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function courseActionDiagnostics(error: unknown) {
  const source = record(error);
  const meta = record(source.meta);
  const adapterCause = record(record(meta.driverAdapterError).cause);
  const constraint = record(adapterCause.constraint);
  const knownConstraints = new Set([
    "Resource_lessonId_fkey",
    "Lesson_moduleId_fkey",
    "Module_courseId_fkey",
    "Course_userId_fkey",
    "PlaylistImport_userId_fkey",
    "PlaylistImport_userId_requestId_key",
  ]);
  const candidate = [
    meta.constraint,
    meta.constraint_name,
    meta.field_name,
    constraint.index,
  ].find((value) => typeof value === "string" && knownConstraints.has(value));
  return {
    databaseCode:
      typeof source.code === "string" && /^P\d{4}$/.test(source.code)
        ? source.code
        : undefined,
    constraint: candidate,
  };
}

// Keep provider/database messages and connection details out of API responses.
export function courseActionFailure(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (["P2021", "P2022"].includes(code))
    return {
      error:
        "Course creation is unavailable because the database schema is out of date. Contact support to update the database.",
      code: "COURSE_DATABASE_SCHEMA",
      status: 503,
    };
  if (code === "P2003")
    return {
      error:
        "The database rejected a relationship while saving the course. Contact support with the reference below so the import can be repaired.",
      code: "COURSE_RELATIONSHIP_FAILED",
      status: 500,
    };
  if (code === "P2028")
    return {
      error:
        "The database could not complete the course transaction. Please retry the import. If this continues, contact support with the reference below.",
      code: "COURSE_TRANSACTION_FAILED",
      status: 503,
    };
  if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code))
    return {
      error:
        "The course database is temporarily unavailable or busy. Please try again shortly.",
      code: "COURSE_DATABASE_UNAVAILABLE",
      status: 503,
    };
  if (["P2002", "P2034"].includes(code))
    return {
      error:
        "Another request conflicted with this import. Please retry to check whether your course was already created.",
      code: "COURSE_WRITE_CONFLICT",
      status: 409,
    };
  return {
    error:
      "An unexpected server error interrupted the import. Please retry. If it continues, contact support with the reference below.",
    code: "COURSE_IMPORT_FAILED",
    status: 500,
  };
}

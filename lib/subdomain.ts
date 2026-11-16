const reserved = new Set([
  "www",
  "login",
  "sign-in",
  "sign-up",
  "pricing",
  "outline",
  "checkout",
  "creators",
  "app",
  "api",
  "admin",
  "auth",
  "mail",
  "support",
  "help",
  "blog",
  "docs",
  "dashboard",
  "settings",
  "status",
  "static",
  "cdn",
  "assets",
  "lessonmap",
]);
export function validSubdomain(value: string) {
  return (
    /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(value) && !reserved.has(value)
  );
}

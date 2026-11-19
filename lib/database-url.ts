// pg currently treats these modes as verify-full. Make that behavior explicit
// before its next major version changes the meaning of these aliases.
export function databaseConnectionString(value: string | undefined) {
  if (!value) return value;
  const url = new URL(value);
  const mode = url.searchParams.get("sslmode");
  if (
    url.searchParams.get("uselibpqcompat") !== "true" &&
    mode &&
    ["prefer", "require", "verify-ca"].includes(mode)
  ) {
    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  }
  return value;
}

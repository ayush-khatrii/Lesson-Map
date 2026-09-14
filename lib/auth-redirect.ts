// Only allow local destinations after authentication.
export function getAuthRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) {
    return "/dashboard";
  }
  try {
    const url = new URL(value, "https://lessonmap.vercel.app");
    if (url.origin !== "https://lessonmap.vercel.app" || /^\/(sign-in|sign-up|api\/auth)(\/|$)/.test(url.pathname)) {
      return "/dashboard";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

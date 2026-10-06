export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;

  try {
    const expectedOrigin = process.env.NEXT_PUBLIC_BASE_URL?.trim()
      ? new URL(process.env.NEXT_PUBLIC_BASE_URL).origin
      : new URL(request.url).origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

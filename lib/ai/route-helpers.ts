import { auth } from "@/lib/auth";
import { AiError } from "./http";
export { aiFailure } from "./failure";

export async function aiUserIdFor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session.userId) throw new AiError(401, "Please sign in first.");
  return session.session.userId;
}

// Cookie-authenticated, same-origin JSON requests only (CSRF protection).
export function assertSameOriginJson(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(process.env.NEXT_PUBLIC_BASE_URL || request.url).origin;
  if (!origin || origin !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AiError(403, "Please continue from this website.");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new AiError(415, "Send a JSON request.");
  }
}

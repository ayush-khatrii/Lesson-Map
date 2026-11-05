import { toNextJsHandler } from "better-auth/next-js";
import { getAdminAuth } from "@/lib/admin/auth";
import { privateJson, audit } from "@/lib/admin/http";

// Only email/password sign-in and the session lifecycle are exposed for admins.
const allowed = new Set(["sign-in/email", "get-session", "sign-out", "error"]);
async function handle(request: Request) {
  const path = new URL(request.url).pathname.replace(
    /^\/api\/admin\/auth\//,
    "",
  );
  if (!process.env.ADMIN_AUTH_SECRET?.trim())
    return privateJson(
      { error: "Administrator access is not configured." },
      503,
    );
  if (!allowed.has(path)) return privateJson({ error: "Not found." }, 404);
  const handlers = toNextJsHandler(getAdminAuth().handler);
  const response = await (request.method === "GET"
    ? handlers.GET(request)
    : handlers.POST(request));
  if (path === "sign-in/email") {
    await audit(
      null,
      response.status >= 400 ? "ADMIN_SIGN_IN_FAILED" : "ADMIN_SIGN_IN_ATTEMPT",
    );
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const GET = handle;
export const POST = handle;

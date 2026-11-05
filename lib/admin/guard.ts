import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { getAdminAuth } from "./auth";
import { sessionIsVerified, verificationIsFresh } from "./policy";

export class AdminError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function requireAdmin(
  options: {
    verified?: boolean;
    fresh?: boolean;
    superAdmin?: boolean;
    requestHeaders?: Headers;
  } = {},
) {
  // Read request state first: this authorization check must never be prerendered.
  const requestHeaders = options.requestHeaders ?? (await headers());
  if (!process.env.ADMIN_AUTH_SECRET?.trim())
    throw new AdminError(
      503,
      "ADMIN_NOT_CONFIGURED",
      "Administrator access is not configured.",
    );
  const identity = await getAdminAuth().api.getSession({
    headers: requestHeaders,
  });
  if (!identity)
    throw new AdminError(401, "SIGN_IN_REQUIRED", "Please sign in.");
  const [session, access] = await Promise.all([
    db.adminSession.findUnique({ where: { id: identity.session.id } }),
    db.adminAccess.findUnique({ where: { userId: identity.user.id } }),
  ]);
  const now = Date.now();
  if (
    !session ||
    session.userId !== identity.user.id ||
    !access?.active ||
    session.expiresAt.getTime() <= now ||
    session.createdAt.getTime() + 8 * 3600000 <= now
  ) {
    throw new AdminError(401, "SIGN_IN_REQUIRED", "Please sign in.");
  }
  if (options.verified !== false && !sessionIsVerified(session, access, now)) {
    throw new AdminError(
      403,
      "VERIFICATION_REQUIRED",
      "Authenticator verification is required.",
    );
  }
  if (options.superAdmin && access.role !== "SUPER_ADMIN")
    throw new AdminError(403, "FORBIDDEN", "Super admin access is required.");
  if (options.fresh && !verificationIsFresh(session.verifiedAt, now))
    throw new AdminError(
      403,
      "REAUTH_REQUIRED",
      "Verify your authenticator to continue.",
    );
  return { user: identity.user, session, access };
}

export async function requireAdminPage() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (
      error instanceof AdminError &&
      (error.code === "VERIFICATION_REQUIRED" ||
        error.code === "REAUTH_REQUIRED")
    )
      redirect("/dashboard/admin/verify");
    if (error instanceof AdminError && error.status === 401)
      redirect("/dashboard/admin/login");
    throw error;
  }
}

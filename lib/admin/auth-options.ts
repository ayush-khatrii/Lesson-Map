import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { ADMIN_SESSION_SECONDS } from "./policy";

// A separate session model, cookie namespace and OAuth state isolate app sessions.
export function adminAuthOptions(
  canSignIn: (userId: string) => Promise<boolean>,
  onSignIn?: (userId: string) => Promise<void>,
) {
  return {
    basePath: "/api/admin/auth",
    advanced: { cookiePrefix: "lessonmap-admin" },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      modelName: "adminSession",
      expiresIn: ADMIN_SESSION_SECONDS,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    verification: { modelName: "adminVerification" },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "adminRateLimit",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-in/social": { window: 60, max: 10 },
      },
    },
    account: { accountLinking: { enabled: true } },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (
          ctx.path === "/sign-in/email" &&
          typeof ctx.body?.email === "string"
        ) {
          return {
            context: {
              body: { ...ctx.body, email: ctx.body.email.trim().toLowerCase() },
            },
          };
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async () => {
            throw new APIError("FORBIDDEN", { message: "Unable to sign in." });
          },
        },
      },
      account: {
        create: {
          before: async (account) => {
            if (!(await canSignIn(account.userId)))
              throw new APIError("FORBIDDEN", {
                message: "Unable to sign in.",
              });
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            if (!(await canSignIn(session.userId)))
              throw new APIError("FORBIDDEN", {
                message: "Unable to sign in.",
              });
          },
          after: async (session) => {
            await onSignIn?.(session.userId);
          },
        },
      },
    },
  } satisfies BetterAuthOptions;
}

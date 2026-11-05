import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { randomUUID } from "node:crypto";
import type { EmailEvent, SendEmailAction } from "@/lib/email/types";

function duplicateEmail(): never {
  throw new APIError("UNPROCESSABLE_ENTITY", {
    code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    message: "User with this email already exists. Please sign in.",
  });
}

// Check the user table, regardless of which authentication provider owns the account.
export function emailAuthOptions(
  findExistingUser: (email: string) => Promise<{ id: string } | null>,
  sendEmail?: SendEmailAction,
) {
  async function deliver(event: EmailEvent) {
    try {
      await sendEmail?.(event);
    } catch {
      // Delivery must not interrupt authentication, token consumption, or
      // session cleanup, even if an unexpected transport failure escapes.
      console.error("Authentication email action failed", {
        action: event.action,
      });
    }
  }
  return {
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
      resetPasswordTokenExpiresIn: 3600,
      ...(sendEmail
        ? ({
            sendResetPassword: async ({ user, url, token }) => {
              await deliver({
                action: "PASSWORD_RESET_REQUESTED",
                to: user.email,
                name: user.name,
                eventId: token,
                resetUrl: url,
              });
            },
            onPasswordReset: async ({ user }) => {
              // This callback runs once for the successful, consumed reset token.
              await deliver({
                action: "PASSWORD_RESET_COMPLETED",
                to: user.email,
                name: user.name,
                eventId: `${user.id}/${randomUUID()}`,
              });
            },
          } satisfies Partial<
            NonNullable<BetterAuthOptions["emailAndPassword"]>
          >)
        : {}),
      // Reject duplicates found after the precheck instead of returning a fake user.
      // onExistingUserSignUp is a background callback; its errors are swallowed.
      customSyntheticUser: () => duplicateEmail(),
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (!sendEmail) return;
            // Better Auth queues this hook after the transaction. Verify the
            // row survived: some adapter versions also flush hooks on rollback.
            try {
              const persisted = await findExistingUser(user.email);
              if (persisted?.id !== user.id) return;
              await deliver({
                action: "WELCOME",
                to: user.email,
                name: user.name,
                eventId: user.id,
              });
            } catch {
              console.error("Welcome email action failed");
            }
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email" && ctx.path !== "/sign-in/email")
          return;
        if (typeof ctx.body?.email !== "string") return;

        const email = ctx.body.email.trim().toLowerCase();
        if (ctx.path === "/sign-up/email" && (await findExistingUser(email))) {
          duplicateEmail();
        }
        return { context: { body: { ...ctx.body, email } } };
      }),
    },
  } satisfies BetterAuthOptions;
}

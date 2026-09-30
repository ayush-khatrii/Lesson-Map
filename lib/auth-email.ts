import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

function duplicateEmail(): never {
  throw new APIError("UNPROCESSABLE_ENTITY", {
    code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    message: "User with this email already exists. Please sign in.",
  });
}

// Check the user table, regardless of which authentication provider owns the account.
export function emailAuthOptions(
  findExistingUser: (email: string) => Promise<{ id: string } | null>,
) {
  return {
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
      // Reject duplicates found after the precheck instead of returning a fake user.
      // onExistingUserSignUp is a background callback; its errors are swallowed.
      customSyntheticUser: () => duplicateEmail(),
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email" && ctx.path !== "/sign-in/email") return;
        if (typeof ctx.body?.email !== "string") return;

        const email = ctx.body.email.trim().toLowerCase();
        if (ctx.path === "/sign-up/email" && await findExistingUser(email)) {
          duplicateEmail();
        }
        return { context: { body: { ...ctx.body, email } } };
      }),
    },
  } satisfies BetterAuthOptions;
}

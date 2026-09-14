# Email and password authentication

The sign-in page provides email sign-in, an account creation form, and Google/GitHub buttons. All three methods use Better Auth's existing `/api/auth/[...all]` handler and Prisma adapter. There is no custom password API or browser password storage.

## Flow

1. Choose **Create an account** and enter a name, email, and 12–128 character password. The form calls `signUp.email`; Better Auth validates the request on the server, hashes the password with its default salted scrypt implementation, and writes the user plus an `account` record with `providerId = "credential"`. Only the hash is stored in `account.password`.
2. Registration returns a generic message and asks the user to sign in. Automatic sign-in is disabled so duplicate registrations do not disclose whether an email is registered. Registering again never overwrites an existing password.
3. The form calls `signIn.email`. Better Auth verifies the password hash, creates a database session, and sets its HttpOnly session cookie (Secure on HTTPS/production). Invalid credentials receive a generic message.
4. The browser navigates to a validated local destination. Protected server pages and API handlers use `auth.api.getSession` and ownership checks. The proxy's cookie check is only an early redirect, not authorization. The login page also validates the session against the database, so expired cookies do not cause redirect loops.
5. Existing sign-out uses Better Auth to invalidate the session and clear its cookie.

## Security and limits

- Server-enforced password length; passwords are never trimmed, logged, or saved in localStorage.
- Better Auth's built-in origin/CSRF checks remain enabled.
- Database-backed rate limits: five email sign-in attempts and three sign-ups per IP per minute. Database storage shares counters across serverless instances. The hosting proxy must supply trustworthy client IP headers.
- Redirects only allow local paths. Auth hosts are restricted to the configured deployment host and localhost in development.
- Automatic account linking is disabled to prevent merging unverified password registrations into OAuth accounts. Existing Google/GitHub accounts should continue using their existing provider; existing linked accounts remain intact.
- Email ownership is **not verified** in this basic flow. Verification and forgotten-password emails are not enabled because no email delivery service is configured. Do not treat `emailVerified = false` as a verified identity. Add a mail provider and Better Auth verification/reset callbacks before requiring those features.

## Database and deployment

`20260914120000_email_password_auth` adds `user.updatedAt` and the `rateLimit` table. Existing `user`, `account.password`, and `session` tables are reused. The migration is additive and preserves existing users and courses.

Apply migrations to each deployment database with `npx prisma migrate deploy`, then generate the client with `npx prisma generate`. Keep `DATABASE_URL`, a strong `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_BASE_URL` (the HTTPS production origin), and your Google/GitHub provider credentials configured in the deployment environment. Never prefix secrets with `NEXT_PUBLIC_`.

Reference: https://better-auth.com/docs/authentication/email-password

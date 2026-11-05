# Business dashboard

The private business workspace is at `/dashboard/admin`. The customer course workspace remains at `/dashboard`.

## Setup

1. Install dependencies and run `npx prisma generate`.
2. Configure PostgreSQL and apply migrations with `npx prisma migrate deploy`. The migration grants no privileges by default. A partial unique index permits only one super admin, including concurrent bootstrap attempts.
3. Set these server-only deployment secrets (keep stable across deployments):
   - `ADMIN_AUTH_SECRET`: a separate random authentication secret. Generate with `openssl rand -base64 48`.
   - `ADMIN_TOTP_ENCRYPTION_KEY`: an independent encryption key. Generate with `openssl rand -hex 32`. Back it up securely; replacing it makes enrolled authenticators unreadable.
4. Keep `NEXT_PUBLIC_BASE_URL` set to the application origin. Admin authentication uses email and password only; no OAuth provider or callback is configured for the business workspace.
5. Grant the single super-admin role to an **existing** account:
   ```sh
   npm run admin:bootstrap -- --email existing-user@example.com
   ```
6. Sign in with an existing email/password credential, enroll an authenticator, and save the recovery codes. Settings can grant other existing users full business access. Only the super admin manages access.

### First login: where does the password come from?

There is no generated business-dashboard password. Email sign-in uses the password chosen when creating the LessonMap account. Granting admin access does not create or send a password, and a Google-only account has no email password.

If you never set a password or cannot remember it, run this in an interactive terminal configured with the database for the deployment you want to access:

```sh
npm run admin:bootstrap -- --email existing-user@example.com --set-password
```

Enter and confirm your own new password at the hidden prompts (12–128 characters). Do not put the password in the command or a chat message. This explicitly creates or replaces the existing super admin's shared LessonMap password, stores only its hash, and revokes that account's app and admin sessions. It does not change another super admin or reset authenticator enrollment. There is no reset email because email delivery has not been configured.

Then sign in with email and password at `/dashboard/admin/login` and enroll or verify your authenticator. Password changes are performed by an operator through the command above; there is no password-setup UI or public password-reset endpoint for the admin workspace.

Admin identities reuse the application user/account records; cookies, sessions, throttling, membership, and authenticator secrets are separate. Public app sessions cannot open admin endpoints. There is no admin signup. Admin social sign-in, account linking, and OAuth callbacks are not exposed. Public app authentication keeps its own provider configuration.

### Where the email and password hash are stored

The email is in `user.email`. The Better Auth password hash is in **`account.password`**, on the row whose **`providerId` is `credential`** and whose `userId` matches that user's `user.id`. `AdminAccess` stores the `SUPER_ADMIN` role and active status; it does not contain a password.

To locate the super admin's credential row in your database SQL editor:

```sql
SELECT u.email, a.id AS "accountId", a."userId", a.password
FROM "AdminAccess" AS access
JOIN "user" AS u ON u.id = access."userId"
JOIN "account" AS a ON a."userId" = u.id
WHERE access.role = 'SUPER_ADMIN'
  AND a."providerId" = 'credential';
```

This password is shared with the regular LessonMap account. Use the setup script to store a compatible hash and revoke existing sessions when changing it; entering a plain-text password directly in `account.password` will not work.

## Billing and coupons

Configure the existing `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_ENVIRONMENT`, `DODO_PRODUCT_CREATOR`, `DODO_PRODUCT_PROFESSIONAL`, and webhook secret. Use product IDs and an API key from the same environment. Reporting requires Payments, Refunds, and Subscriptions read access; coupon management requires Discounts write access. Both plans must be configured to offer a coupon for both.

Reports use Dodo's official SDK, paginate completely, and restrict payments to the configured plan products. Refunds outside the original purchase period are attributed using the parent payment/subscription. Incomplete or ambiguous mixed-product data is unavailable rather than included in totals. Complete billing results are cached for one minute; Refresh requests a new read. Cached snapshots expire after seven days. Failed reads never become zero revenue.

Gross collections include customer-paid tax. Net collections subtract successful refunds booked in the selected period, including refunds against older purchases. Net collections are not profit or payouts: processor fees and expenses are not deducted. Currencies are never summed or converted. Reports use Asia/Kolkata; relative windows are rounded to the minute. Percentage comparisons use the immediately preceding equal-duration window. All-time reports have no comparison period.

Current plan/user/content totals are current records, not historical snapshots. Deleted content is absent from inventory. Paid status uses the application's effective-plan rules, including access retained during scheduled cancellation. Payment success is succeeded attempts divided by succeeded plus failed attempts; pending and cancelled attempts are excluded.

Coupons support percentage discounts, explicit plan products, activation/expiry times, redemption limits, customer eligibility, and recurring billing duration. Defaults are the first billing cycle, one redemption per customer, and removal on plan changes. Once redeemed, financial terms are locked; create a replacement code to change them. Hosted checkout accepts codes and Dodo enforces redemption. Existing subscription discounts remain under Dodo's billing rules. Other Dodo products and unrestricted coupons are not managed here.

## Security and recovery

Admin sessions last eight hours and lock after 30 minutes without foreground activity. Coupon/access writes require authenticator verification within five minutes. TOTP verification is throttled and consumes each accepted time counter transactionally to reject replay. Code prompts use one field without code-length hints.

Authenticator secrets use authenticated encryption with user-bound associated data; recovery codes are random, hashed, single-use, and shown only at issuance. Recovery revokes every admin session for that user and clears enrollment. Sign in again, enroll a new authenticator, and save replacement recovery codes. Revoking an administrator invalidates access and sessions immediately. The super admin cannot be revoked through Settings.

If all authenticators and recovery codes are lost, an operator with database access must reset that user's admin enrollment, increment `securityVersion`, delete recovery codes, and revoke all of their `AdminSession` records in one transaction. No unauthenticated reset endpoint exists.

## Validation

Run `npm run test:admin`, `npm run test:auth`, `npm run test:payments`, `npm run typecheck`, and `npm run build`. Admin tests use an embedded PostgreSQL instance for migration and reporting queries and mocked Dodo responses for failure cases. They never create live payments or coupons.

The existing Alan Sans font is bundled locally, so building does not download fonts from Google. If the execution environment blocks Turbopack's internal process port, use `npm run build:webpack` to produce the same Next.js application with Webpack.

Before production use, check email/password sign-in, enrollment/recovery, mobile navigation, keyboard operation, and a complete coupon redemption using Dodo test mode. Confirm configured Dodo API permissions and product IDs. A local build cannot validate a real provider checkout.

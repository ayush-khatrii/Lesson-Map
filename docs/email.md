# Transactional email with Resend

LessonMap sends email only when an enabled action occurs. Installing dependencies,
starting the application, adding a key, and deploying do not send email or replay
past events. There is no public email-sending endpoint.

## Configure Resend

1. Open [Resend Domains](https://resend.com/domains), add `lessonmap.org`, and
   enable sending. Creating the `welcome`, `accounts`, and `support` inboxes is
   separate from verifying a sending domain.
2. Add the exact DNS records displayed by Resend at your DNS provider, including
   its DKIM record and SPF/return-path records. Use Resend's displayed hostnames,
   record types, priorities, and values. Wait until Resend marks the sending
   domain as verified. See [domain verification](https://resend.com/docs/dashboard/domains/introduction).
3. Create an API key in [Resend API Keys](https://resend.com/api-keys) with sending
   access to this domain. One key supports both sender addresses.
4. Fill in the blank `RESEND_API_KEY=` entry in the untracked local `.env`. Also
   set it as a server environment variable in your deployment provider, then
   restart/redeploy. Never use a `NEXT_PUBLIC_` prefix for this key.
5. Set `NEXT_PUBLIC_BASE_URL` to the application's actual origin, such as
   `https://lessonmap.org` if that is where the app is hosted. This determines
   links in emails and must agree with Better Auth's reset-link origin.
6. Keep receiving enabled for `support@lessonmap.org` if you want to receive
   replies. Receiving/inbox webhooks are not needed for this sending integration.

No live message has been sent as part of setup. With the API key blank, email
delivery returns `skipped/not_configured`; authentication and payments continue
to work. Live delivery can only be verified after you configure credentials and
domain verification. For any later manual delivery check, use Resend's designated
test recipient `delivered@resend.dev`.

## Action controls

Edit [`constants/email.ts`](../constants/email.ts) to change an action's `enabled`
flag, fixed subject, or verified sender. All five core actions are enabled by
default, but require the API key before they can send.

| Action | Trigger | Sender |
| --- | --- | --- |
| `WELCOME` | Persisted new user, including Google/GitHub OAuth | `welcome@lessonmap.org` |
| `PURCHASE_ACTIVATED` | Accepted, signed Dodo `subscription.active` webhook | `accounts@lessonmap.org` |
| `PLAN_RENEWED` | Accepted, signed Dodo `subscription.renewed` webhook | `accounts@lessonmap.org` |
| `PASSWORD_RESET_REQUESTED` | Better Auth reset-request callback | `accounts@lessonmap.org` |
| `PASSWORD_RESET_COMPLETED` | Better Auth successful-reset callback | `accounts@lessonmap.org` |

Every action uses `support@lessonmap.org` as `replyTo`. There are no email triggers
for sign-in, ordinary password changes, plan changes, cancellations, failures,
expiry, checkout creation, or browser checkout return. Purchase activation means
the initial activation of a subscription, not every payment or renewal. Checkout
recovery may update access first; the activation webhook still sends the email.

Ensure Dodo's existing signed webhook endpoint at
`/api/webhooks/dodopayments` subscribes to `subscription.active` and
`subscription.renewed`, in addition to the access-related events already used by
the app. Emails are sent after the database transaction commits, to the matched
user's stored email rather than a caller-supplied recipient.

## Password reset callbacks

The backend uses Better Auth's existing `/api/auth/request-password-reset` and
`/api/auth/reset-password` endpoints. Reset requests are limited to three per
minute per Better Auth rate-limit key; reset submissions are limited to five.
Unknown emails retain Better Auth's generic success response.

No forgot-password or reset-password screens are included. A future reset UI
must send a `redirectTo` URL on the trusted application origin, implement the
page at that URL, and submit the returned token with the new password. The email
uses Better Auth's generated link unchanged; tokens expire after one hour and
cannot be reused after a successful reset. The existing 12–128 character password
policy remains enforced. A successful reset sends a separate confirmation email.

## Delivery behavior and tests

Each event gets one awaited delivery attempt, with a ten-second request timeout.
Email errors never roll back a
signup, completed reset, or payment update. Failures log only the action and
failure category, without recipients, provider messages, credentials, reset
links, or email bodies. There is no queue, scheduled sender, or automatic retry.
Missing credentials and disabled actions are skipped silently.

Resend receives a hashed event identifier as an idempotency key in the SDK's
second argument. Welcome keys use the user ID; purchase keys use the subscription
ID; renewal keys use the webhook delivery ID; reset-request keys use the token
(hashed before transmission in the header); reset confirmations get an identifier
for that successful callback. Resend retains keys for
[24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys).
The existing database webhook records also suppress repeat deliveries of the
same webhook ID after that window. Separate activation events with different
webhook IDs rely on Resend's 24-hour window for the same subscription.

Because delivery happens after the webhook is recorded, replaying a processed
webhook will not retry an email that failed or was skipped. There is no historical
backfill when a key is added or an action is re-enabled. Investigate failures in
application logs and Resend's dashboard; recovery requires a deliberate manual
action outside this integration.

Run `npm run test:email`, `npm run test:auth`, `npm run test:payments`, and
`npm run typecheck`. Tests mock the sending boundary and do not contact Resend.

# Course offers and analytics rollout

Apply the additive migration before deploying the application:

```sh
npx prisma migrate deploy
npx prisma generate
npm run build
```

The migration adds optional offer fields (disabled by default) and course/date indexes. It preserves existing course, lead, and event data. Deploy using the repository's existing hosting workflow. An application rollback can retain the additional columns and indexes; do not delete analytics records.

Creator and Professional users configure offers under the course editor's Settings tab. The dashboard's Analytics button opens the course-specific report. A downgrade hides offers and prevents analytics access while retaining saved settings and history.

After deployment, verify a public course as a signed-out visitor: open the outline, start a lesson, submit an email with consent, and open the paid-course offer. Refresh its owner's analytics report and verify the matching counts. Repeat-clicks in one browser session count once. Owner visits and clicks are excluded. Verify private outlines and other creators' analytics remain inaccessible.

Reports use UTC calendar boundaries. Visits and starts retain their existing session-based semantics. Email signups count unique course/email records; click history begins with this release. Analytics records activity, not purchases. Tracking failures do not block external navigation. Monitor existing application error reporting for offer, event, and analytics endpoint failures after release.

## Billing notifications

Apply all pending Prisma migrations before deploying application code. Billing delivery uses the additive `BillingEmail` table. Configure `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_ENVIRONMENT`, `DODO_PAYMENTS_WEBHOOK_SECRET`, `DODO_PRODUCT_CREATOR`, `DODO_PRODUCT_PROFESSIONAL`, `RESEND_API_KEY`, `NEXT_PUBLIC_BASE_URL`, and `CRON_SECRET` in the deployment environment.

Subscribe the Dodo webhook endpoint to `payment.succeeded` as well as the existing subscription events. Each successful subscription payment queues one receipt with its provider-generated invoice PDF attached. Subscription lifecycle events update access. Invoice or email failures leave a pending job for retry.

Vercel runs `/api/cron/billing` daily at 09:00 UTC. It queues renewal or expiry reminders three UTC calendar days ahead, finalizes elapsed cancellations, and retries pending emails. Delayed reminders show the exact billing date and use adjusted subject wording. Access checks enforce the exact paid end timestamp independently of this daily job. The cron can also be called with `Authorization: Bearer <CRON_SECRET>` to process pending work after a temporary delivery outage.

Cancellation retains paid features through the stored paid end date. Legacy cancelled accounts that were downgraded early are checked against Dodo before remaining paid time is restored. Review pending `BillingEmail` rows with `lastError` set and application billing-job errors after deployment.

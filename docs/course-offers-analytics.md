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

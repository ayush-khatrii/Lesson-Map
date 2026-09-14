# Functionality review — 2026-09-14

Scope: source review of profile/navigation, authentication, resources, public previews, pricing/configuration, and available tests. This is not an exhaustive browser or live-payment audit.

## Fixed in this review

- `/settings` now renders the shared global navbar through `app/settings/layout.tsx`, including mobile navigation, theme toggle, and account menu.
- Global sign-out now navigates away from protected content after Better Auth succeeds and shows failures instead of silently leaving stale content visible.
- Resource type edits were stripped by `updateResourceSchema`; the type is now validated and persisted.
- Public course image/PDF resources now use the authorized file-opening endpoint, which resolves stored R2 object keys. Images, PDFs, and links open separately; notes/code retain their popup.
- Removed the root route group's boilerplate “Create Next App” metadata so it inherits LessonMap metadata.
- New upload URLs are scoped to the authenticated user and an owned lesson. The signed request fixes the content type and length, and resource creation verifies the stored object's owner, lesson, type, and size metadata.
- Uploaded resource deletion now removes its unreferenced R2 object. A protected daily reconciliation job removes abandoned and cascade-orphaned objects after 24 hours.
- Active Creator and Professional subscriptions now receive creator-branded public pages without LessonMap footer branding. Free and expired plans keep LessonMap branding.

## Pending or at risk

1. **Account recovery and email ownership:** no verification/reset mail service is configured. Email accounts can log in but cannot use a forgotten-password flow. Existing OAuth accounts must use their provider; automatic linking is disabled.
2. **Local configuration:** GitHub client ID/secret, DeepSeek API key, and Creator product ID are absent in the local environment. Google credentials are present. The preferred Dodo API key variable is absent; the payment client also accepts the legacy `DODOPAYMENTS_KEY` alias. Production environment values were not inspected.
3. **Lesson progress:** `lib/useLessonProgress.ts` stores progress in localStorage, not per-user database records. It does not sync across devices and its write/reset operations do not handle storage failures. Course transitions can also reuse previously loaded state. This needs a focused persistence fix.
4. **Deployment URL fallback:** publishing still falls back to localhost if `NEXT_PUBLIC_BASE_URL` is absent. Set that environment variable on production, or centralize origin resolution with the profile page.

Set `CRON_SECRET` in production so Vercel can authorize the cleanup schedule. Live R2 uploads, OAuth callbacks, and payment flows need production smoke checks after deployment.

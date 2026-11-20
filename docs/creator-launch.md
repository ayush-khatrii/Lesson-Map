# Creator launch setup

This release uses the existing Next.js routes, Prisma database, Better Auth, and Dodo Payments. There are no workers or background jobs.

## Database

Run these commands with the database connection for the intended deployment:

```sh
npx prisma migrate deploy
npx prisma generate
```

The migration adds a subdomain and playlist import count to users, an email capture toggle to courses, and four small tables: playlist import receipts, visit/start events, email leads, and per-user lesson progress. Foreign keys remove events/leads when courses are deleted and progress when a lesson or user is deleted. Import receipts survive deleting a course so deleting a course does not restore the Free allowance.

Lesson progress is now account-based. Opening a lesson records its first start; completing or unchecking it updates that user's completion. Reads return only that user's accessible lessons. An empty database shows zero completed lessons. Old browser progress is neither read, copied, nor deleted. Anonymous viewers can browse, but must sign in to save progress. Progress is saved on the main domain; subdomain pages link there for sign-in. Visit and start counts remain anonymous, deduplicated per tab session and course; owner previews are excluded. Event writes are throttled to 300 per minute per course. Dashboard totals refresh with its existing cache (about one minute).

## Creator price

Set `DODO_PRODUCT_CREATOR` to the Creator recurring product ID, in the same mode as your payment key. Checkout, subscription webhooks, and admin revenue reports use this product. Manage pricing and offer timing in Dodo Payments; there is no separate early-bird product variable or automatic offer timer in the app.

The public pricing copy is maintained separately from Dodo and must be updated when the advertised offer changes. Account billing uses the provider portal for the subscriber's actual price. Before replacing the product ID, account for existing subscriptions: their webhooks and reports still reference the original product.

## YouTube

Enable **YouTube Data API v3** in your Google Cloud project, create an API key restricted to that API, and set server-only `YOUTUBE_API_KEY`. No Google account connection or additional package is needed.

Use New Course → Import a YouTube playlist. The importer reads playlist metadata and paginated videos, creates a private draft with one module, and opens the existing outline editor. Each available video becomes a lesson with a YouTube link. Deleted/private videos are skipped and reported. Imports do not use the AI allowance. A playlist can contain up to 500 items so it fits in one request; larger playlists are rejected rather than partially imported. The route permits up to 120 seconds on hosting that supports that duration.

Free accounts receive one successful lifetime import and must have a free course slot. Creator has no plan import count limit. Both have request throttling (five import attempts per minute per account). Retrying the same request reuses its receipt, and failed imports do not charge the allowance.

## Subdomains

1. Set `NEXT_PUBLIC_BASE_URL=https://lessonmap.org`.
2. Add both `lessonmap.org` and `*.lessonmap.org` to the existing hosting project.
3. Configure wildcard DNS using your host's supplied target. Complete wildcard TLS verification; some hosts require their nameservers for wildcard certificates.
4. Claim a name in Settings → Settings, then verify `https://yourname.lessonmap.org` lists only that creator's public roadmaps.
5. Open a public roadmap there and check links and OG images. Another creator's slug and private drafts must not be accessible on that subdomain.

Routing uses the deployment's main hostname, so a staging domain with wildcard DNS can also be tested. Login, dashboard, resource downloads, and account APIs stay on the main origin. Canonical course links continue using the main origin. A downgrade disables subdomain pages without releasing the reserved name.

## Sharing and email capture

Free can view Flow maps with the LessonMap watermark. Creator retains unwatermarked Flow and existing export access. “Use this roadmap” requires sign-in, checks the new owner's course allowance, and copies outline text plus public external links into a private draft. It excludes uploaded files, leads, activity, and creator settings.

In the dashboard, expand a course and open **Email capture & leads**. Creator can enable a public signup form. Signups require consent and an email address; a honeypot and a limit of 30 submissions per minute per course reduce spam. Duplicate email addresses per course are ignored. Only the course owner can list or export leads; CSV values are quoted and formulas escaped. Downgrades stop new capture but leave existing leads available to their owner.

No marketing email is sent by the signup form.

## Pricing claims and release checks

Pricing remains limited to Free and Creator at $15 early-bird. Sales mode, GitHub/PDF imports, themes, and Pro are not included. YouTube imports and subdomains are intentionally omitted from pricing copy until their Google key and wildcard hosting are verified in the deployment. Once verified, add those claims to the existing pricing constants.

Run `npm run test:launch`, `npm run test:payments`, `npm run test:ai`, `npm run test:flow`, `npm run test:uploads`, `npm run typecheck`, and `npm run build`.

Before public release, manually check desktop and mobile: a public playlist import, Free limits, cloning after sign-in, watermark visibility, progress persistence on a second signed-in device, consent signup and CSV export, subdomain isolation, and real Dodo test-mode checkout showing $15. Use test accounts and test payment mode for these checks.

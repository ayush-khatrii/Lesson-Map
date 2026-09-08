# AI course generation

The new-course builder has an AI form for topic, audience, module count, and
lessons per module. **Generate & create private course** generates and saves a
complete outline, then opens it in the editor. It creates course and module
descriptions and lesson titles, not full lesson articles or external resources.
The author reviews and edits the private draft before publishing it.

## Setup

1. Add `DEEPSEEK_API_KEY` to your local `.env` and hosting environment. There is
   an empty placeholder in `.env.example`. Never use a `NEXT_PUBLIC_` key name.
2. Set `NEXT_PUBLIC_BASE_URL` to the exact origin you use to access the app
   (for example `http://localhost:3000`). Preview deployments need their own
   origin. Cross-origin generation requests are rejected.
3. Apply the committed Prisma migrations to your intended database using your
   normal deployment migration workflow (`npx prisma migrate deploy` for an
   existing, migration-managed database), then run `npx prisma generate`.
   The new migration adds nullable `Course.audience` and the `AiGeneration`
   usage ledger. No database migration is run automatically by this feature.
   This repository's early migrations assume existing tables; do not treat
   them as a complete bootstrap for a new empty database.
4. Restart the app. Without a key, the form shows that AI is unavailable.

## Where the code lives

| File | Responsibility |
| --- | --- |
| `lib/ai/schema.ts` | Input/output schemas, subscription checks, plan limits |
| `lib/ai/deepseek.ts` | Prompt, fixed model, server-only credential use, provider call |
| `lib/ai/service.ts` | Stored quota checks, request reservations, atomic course creation |
| `app/api/ai/generate/route.ts` | Login, origin checks, bounded JSON input, error responses |
| `components/forms/AiCourseGenerator.tsx` | Topic/audience form, plan controls, retry and loading states |

The integration uses native server-side `fetch`; no SDK is required. DeepSeek
also supports the `openai` package with `baseURL: "https://api.deepseek.com"`.
Changing the HTTP client would not replace authentication, quotas or validation.

## Plan policy

| Plan | Maximum outline per attempt | Monthly attempts |
| --- | --- | --- |
| Free | 1 course, 1 module, 1 lesson | 5 |
| Creator | 1 course, 8 modules, 6 lessons per module | 200 |
| Professional (existing legacy tier) | Same as Creator | 200 |

These are initial product limits, centralized in `AI_LIMITS`. Pricing copy uses
the same values. Free users also retain the existing limit of three saved
courses total. These AI outline limits do not limit manual module creation.

Paid access is checked from the database before generation and before saving.
An active paid subscription qualifies; cancelled subscriptions retain access
only until a recorded, future paid-period end when cancellation is scheduled.
Missing, failed, expired or on-hold subscriptions use Free limits.

Attempts reset on the first of each calendar month in UTC. Once an attempt is
reserved, it counts even if the provider fails or the process times out. This
prevents repeated failures from bypassing cost limits. Invalid inputs, missing
keys, denied requests and replays do not consume another attempt. Token usage
is stored for validated completions; failed/invalid responses can still incur
provider charges even if their token counts are unavailable locally.

## Request and output

`POST /api/ai/generate` accepts this exact input, with a new UUID per intended
generation (reuse it if a network failure leaves the result uncertain):

```json
{
  "requestId": "11111111-1111-4111-8111-111111111111",
  "type": "course",
  "topic": "JavaScript for beginners",
  "audience": "New developers",
  "moduleCount": 6,
  "lessonsPerModule": 3
}
```

The output schema is built first using Zod. Its JSON Schema is included in the
system prompt. DeepSeek JSON mode ensures parseable JSON, but does not enforce
our schema; the server independently rejects extra fields, wrong counts,
missing names, overlong text and truncated responses before any course save.

```json
{
  "courseName": "JavaScript Foundations",
  "description": "A practical introduction to JavaScript for new developers.",
  "modules": [
    {
      "moduleName": "Variables and values",
      "description": "Learn to store and manipulate values in small programs.",
      "lessons": [{ "lessonName": "Declare and use your first variable" }]
    }
  ]
}
```

This small example shows the shape; a 6 × 3 request must return exactly six
modules with three lessons each. The server stores the audience from the user's
validated request and assigns ownership, IDs, order and private visibility.
The browser receives `{ "courseId": "...", "replayed": false }` and navigates
to the saved course. The former `type: "lessons"` demonstration contract is no
longer supported by this full-course endpoint.

## Security and reliability

- One fixed provider host/model, server-held key, bounded input/output and a
  45-second provider timeout. The hosting function needs a 60-second budget.
- Session-based ownership and plan checks; browser-supplied plan, user ID,
  model, arbitrary resource fields or token settings are rejected.
- A database reservation allows one in-flight attempt per user and applies a
  15-second cooldown. Abandoned reservations expire after two minutes.
- A user-row lock serializes quota/slot decisions across application instances.
  It is released before contacting DeepSeek. Manual course creation uses the
  same lock when claiming Free course slots.
- Duplicate request IDs replay the user's existing result. The same ID cannot
  be reused with different inputs, and deleted courses are not recreated.
- Course, modules, lessons and successful-attempt status commit together.
  Invalid output cannot leave a partially populated course.
- No automatic provider retries, raw provider-error forwarding, prompt logging
  or model-controlled database operations. React renders generated text normally.
- Topics and audiences are sent to DeepSeek; this is disclosed beside the button.
- The legacy `/outline/[id]` route now enforces access and redirects to the
  canonical preview. Real previews are not enriched with sample resources.

Schema validation checks shape, not factual accuracy or teaching quality.
Review representative outputs before launch. Per-account quotas do not prevent
abuse through many accounts; monitor provider spending and adjust allowances.

## Verification

Run `npm run test:ai` and `npm run typecheck`. Tests mock the provider and database
to cover request validation, plan bypasses, exact output counts, quota decisions,
duplicate requests, pending requests, failure handling, and nested persistence.
They do not test real PostgreSQL locks or charge DeepSeek credits.

Before launch, use a staging database with the migration applied to check Free
and Creator generation, repeat-click behavior, reload persistence, private
access as another user, publishing, subscription expiry and provider failures.

Official references:

- [DeepSeek quick start and optional SDK](https://api-docs.deepseek.com/)
- [JSON output](https://api-docs.deepseek.com/guides/json_mode/)
- [Thinking mode](https://api-docs.deepseek.com/guides/thinking_mode/)

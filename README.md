# LessonMap

LessonMap is a visual course planning and sharing platform for educators, creators, trainers, and learners.

Create courses from scratch, start from templates, or generate an initial course outline with AI. Organize modules and lessons using drag-and-drop editing, attach learning resources, and publish courses through a simple shareable link.

<img width="1903" height="767" alt="image" src="https://github.com/user-attachments/assets/972b64e4-38c3-4b45-80d5-6239341ecdfd" />

### Turn your knowledge into a course people can follow.

Create a course outline, organize modules and lessons, attach learning resources, and share a public learning page—all in one workspace.

[Try LessonMap](https://lessonmap.vercel.app) · [Explore templates](https://lessonmap.vercel.app/examples) · [View plans](https://lessonmap.vercel.app/pricing) · [Report an issue](https://github.com/ayush-khatrii/Lesson-Map/issues)

Built for independent educators, bootcamp instructors, and creators who want a clear structure for their next course.

## From idea to shared course

1. **Start your outline.** Create a course manually, choose a ready-made template, or generate a draft with AI.
2. **Make it yours.** Edit course details, add modules and lessons, and drag them into the right order.
3. **Add useful material.** Attach code, notes, links, PDFs, or images to individual lessons.
4. **Share and learn.** Enable public sharing and send the link to learners. They can browse lessons and track completion in their browser.

<br />
<br />

# Features

<img width="1565" height="781" alt="image" src="https://github.com/user-attachments/assets/251b39c6-c1b0-46f9-999d-595a0bc6cec7" />

<br />
<br />

| Feature                 | What you can do                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Course dashboard**    | See your courses, module and lesson counts, and sharing status in one place.                                                |
| **Course builder**      | Create, edit, delete, and reorder modules and lessons in an accordion layout.                                               |
| **AI course outlines**  | Describe a topic and audience, choose an outline size, and generate an editable draft with AI.                              |
| **Starter templates**   | Preview DSA and Web Development courses. **Use Template** pre-fills a new course with its modules and lessons.              |
| **Lesson resources**    | Attach code, notes, links, PDFs, and images. Browse resources with their lesson context and preview supported content.      |
| **Code previews**       | Read code resources with syntax highlighting in a scrollable preview.                                                       |
| **Public course pages** | Publish a stable share link with the original creator's name, course details, and curriculum. Turn sharing off when needed. |
| **Learner progress**    | Mark lessons complete and follow the overall progress bar. Progress is saved locally in the current browser.                |
| **Markdown export**     | Paid subscribers can download their own saved course outline as a `.md` file from the builder's Settings tab.               |

<br />
<br />

# Start with a Template

<img width="1464" height="764" alt="image" src="https://github.com/user-attachments/assets/1832f577-2299-4419-ba3b-764df2698a23" />

<br />
<br />

# Give learners a focused page

<img width="1448" height="1086" alt="image" src="https://github.com/user-attachments/assets/32445a97-8b64-4b4f-b5c9-d14bb9603d66" />


## Built with

| Area           | Technology                                        |
| -------------- | ------------------------------------------------- |
| Application    | Next.js 16 App Router, React 19, TypeScript       |
| Interface      | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide icons |
| Data           | PostgreSQL, Prisma 7                              |
| Authentication | Better Auth with GitHub OAuth                     |
| AI             | DeepSeek with Zod-validated outline responses     |
| Payments       | Dodo Payments and signed webhooks                 |
| File storage   | Cloudflare R2 through the AWS S3 SDK              |

## Run locally

Use Node.js 22 LTS, npm, and a PostgreSQL development database. GitHub OAuth is required for sign-in. AI, uploads, and payments need their corresponding service credentials.

### 1. Clone and configure

```bash
git clone https://github.com/ayush-khatrii/Lesson-Map.git
cd Lesson-Map
cp .env.example .env
```

The current `.env.example` contains payment settings but is not a complete environment template. Add the required variables to your local `.env` with your own values.

### 2. Install and prepare the database

```bash
npm ci
npx prisma db push
npx prisma generate
```

### 3. Start the app

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000), sign in, and create a course or try a template.

### Useful commands

```bash
npm run typecheck
npm run build
npm start
```

## Payment configuration (local and Vercel)

Use the same variable names in `.env` and Vercel Project Settings > Environment Variables.
`.env.example` is a template; it does not configure a deployed app.

| Variable | Value |
| --- | --- |
| `DODO_PAYMENTS_API_KEY` | API key from Dodo Developer > API Keys. This is the only API key variable the app reads. |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` for testing, `live_mode` for real purchases. Required explicitly. |
| `DODO_PRODUCT_CREATOR` | Product ID for the Creator $12/month subscription. |
| `DODO_PRODUCT_PROFESSIONAL` | Product ID for Professional, required when checking out that plan. |
| `DODO_PAYMENTS_WEBHOOK_SECRET` | Signing secret for the Dodo webhook endpoint, distinct from the API key. |
| `NEXT_PUBLIC_BASE_URL` | Your application origin, e.g. `https://lessonmap.vercel.app`. |

Find each Product ID under **Dodo Dashboard > Products > View Details**.
These are product IDs, not plan names, prices, API keys, or subscription IDs.
The Dodo product controls the amount and billing interval: configure Creator as a recurring
USD $12 monthly product. The price displayed on the pricing page does not set the checkout price.
Use API keys, products and webhook settings from the same Dodo mode.
See the [Dodo checkout guide](https://docs.dodopayments.com/developer-resources/checkout-session).

For existing deployments, copy the value of `DODO_PAYMENTS_KEY` (or `DODOPAYMENTS_KEY`)
into `DODO_PAYMENTS_API_KEY`, then remove the old API key variables.
Copy `DODOPAYMENTS_WEBHOOK_SECRET` (or `DODO_PAYMENTS_WEBHOOK_SIGNING_SECRET`)
into `DODO_PAYMENTS_WEBHOOK_SECRET`, then remove the old webhook variables.
Do not replace the webhook secret with the API key.

Configure the Dodo webhook URL as `https://YOUR_DOMAIN/api/webhooks/dodopayments`
and subscribe to `subscription.active`, `subscription.renewed`, `subscription.plan_changed`,
`subscription.updated`, `subscription.cancelled`, `subscription.on_hold`,
`subscription.failed`, and `subscription.expired` so payment updates account access.

Apply the variables to the intended Vercel environment (Production or Preview),
then redeploy. Restart `npm run dev` after editing local variables.
If checkout returns `CHECKOUT_NOT_CONFIGURED`, inspect the `/api/checkout` function logs:
they identify the missing or invalid variable without printing its value.
Run `npm run test:payments` to check checkout behavior without charging a card.

Run `npm run check:payments` before testing checkout. It loads the same local environment
files as Next.js and reports missing configuration without exposing secrets or calling
Dodo. Add `-- --all` to check Professional too. Both a product ID and a webhook signing
secret are required in addition to the API key. Product IDs cannot be derived from an
API key: create the recurring product in Dodo and copy its ID into the matching variable.

Checkout reads server environment variables on each request. After adding or rotating
credentials in `.env.local`, restart the local server; on Vercel, update environment
variables and redeploy. Never pass the API key from the browser or prefix it with
`NEXT_PUBLIC_`.

The flow is pricing → sign-in if needed → hosted Dodo checkout → `/checkout/return`.
The return page checks the authenticated subscription status for up to one minute and
offers a retry while confirmation is pending. Signed subscription webhooks update
paid access; the return page can also recover a missed activation by retrieving the
subscription directly from Dodo and verifying its user metadata, product, and active
status on the server. Redirect query parameters alone do not grant access. A cancelled or unsuccessful
checkout leaves the user's plan unchanged.

For local end-to-end testing, expose `/api/webhooks/dodopayments` through a public HTTPS
tunnel and register that URL in the Dodo test-mode dashboard. Complete a test checkout,
confirm that `subscription.active` is delivered successfully, and check that the return
page shows the active plan. A localhost URL alone cannot receive provider webhooks.

## Feedback and contributions

Found a problem or have an idea? [Open an issue](https://github.com/ayush-khatrii/Lesson-Map/issues) with the steps to reproduce it, expected behavior, and a screenshot when useful.

For contributions, keep changes focused and run the relevant checks before opening a pull request.

Created by [Ayush Khatri](https://github.com/ayush-khatrii), with contributions from [Vrut07](https://github.com/vrut07).

Licensed under the [MIT License](LICENSE).

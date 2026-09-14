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

## Feedback and contributions

Found a problem or have an idea? [Open an issue](https://github.com/ayush-khatrii/Lesson-Map/issues) with the steps to reproduce it, expected behavior, and a screenshot when useful.

For contributions, keep changes focused and run the relevant checks before opening a pull request.

Created by [Ayush Khatri](https://github.com/ayush-khatrii), with contributions from [Vrut07](https://github.com/vrut07).

Licensed under the [MIT License](LICENSE).

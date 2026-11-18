import { AI_LIMITS } from "@/lib/ai/schema";
import { COURSE_LIMITS } from "@/lib/plans";
import { MAX_UPLOAD_BYTES, UPLOAD_LIMITS } from "@/lib/r2/upload-policy";

const formatStorageLimit = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${bytes / 1024 ** 3} GB` : `${bytes / 1024 ** 2} MB`;
const maxFileSize = formatStorageLimit(MAX_UPLOAD_BYTES);

export type ExampleCourseTemplate = {
  id: string;
  title: string;
  description: string;
  audience: string;
  category: string;
  level: string;
  modules: Array<{
    title: string;
    description: string;
    lessons: string[];
  }>;
};

export const exampleCourses: ExampleCourseTemplate[] = [
  {
    id: "dsa-fundamentals",
    title: "Data Structures and Algorithms",
    description:
      "Build a practical foundation in data structures, algorithms, problem solving, and complexity analysis.",
    audience: "Beginners preparing for coding interviews and programming courses",
    category: "Computer Science",
    level: "Beginner",
    modules: [
      {
        title: "Algorithm Foundations",
        description:
          "Understand algorithmic thinking, complexity, and the building blocks used throughout the course.",
        lessons: [
          "Introduction to Algorithms",
          "Time and Space Complexity",
          "Big O Notation",
        ],
      },
      {
        title: "Core Data Structures",
        description:
          "Learn how common linear data structures organize information and when to use each one.",
        lessons: [
          "Arrays and Strings",
          "Linked Lists",
          "Stacks and Queues",
          "Hash Tables",
        ],
      },
      {
        title: "Searching and Sorting",
        description:
          "Compare fundamental searching and sorting techniques through practical examples.",
        lessons: [
          "Linear and Binary Search",
          "Bubble, Selection, and Insertion Sort",
          "Merge Sort and Quick Sort",
        ],
      },
      {
        title: "Trees and Graphs",
        description:
          "Explore hierarchical and connected data using traversal-based problem solving.",
        lessons: [
          "Binary Trees",
          "Tree Traversals",
          "Graph Basics",
          "Breadth-First and Depth-First Search",
        ],
      },
    ],
  },
  {
    id: "web-development-fundamentals",
    title: "Complete Web Development",
    description:
      "Learn how modern websites are designed, built, connected to data, and deployed to the web.",
    audience: "Beginners who want to become full-stack web developers",
    category: "Web Development",
    level: "Beginner",
    modules: [
      {
        title: "HTML Foundations",
        description:
          "Structure accessible web pages with semantic HTML and reusable content patterns.",
        lessons: [
          "How the Web Works",
          "HTML Documents and Elements",
          "Forms and Semantic HTML",
        ],
      },
      {
        title: "Responsive CSS",
        description:
          "Style polished layouts that adapt comfortably across phones, tablets, and desktops.",
        lessons: [
          "CSS Selectors and the Box Model",
          "Flexbox and Grid",
          "Responsive Design and Media Queries",
        ],
      },
      {
        title: "JavaScript Essentials",
        description:
          "Add interaction and data-driven behavior using modern JavaScript fundamentals.",
        lessons: [
          "Variables, Functions, and Arrays",
          "DOM Events and Manipulation",
          "Async JavaScript and APIs",
        ],
      },
      {
        title: "Full-Stack Application",
        description:
          "Connect the frontend to a backend, persist data, and deploy a complete project.",
        lessons: [
          "Frontend Component Architecture",
          "Server APIs and Databases",
          "Authentication Basics",
          "Testing and Deployment",
        ],
      },
    ],
  },
];

export function getExampleCourseTemplate(id?: string) {
  return exampleCourses.find((course) => course.id === id);
}

export const plans = [
  {
    name: "Free Plan",
    type: "FREE",
    description:
      "Try your idea, build a roadmap, and share it with your audience.",
    price: "$0",
    period: "/month",
    cta: "Start Free",
    accent: "Starter",
    features: [
      `Up to ${COURSE_LIMITS.FREE} courses`,
      "One complete AI course outline, included once",
      "Unlimited manual modules and lessons",
      `${formatStorageLimit(UPLOAD_LIMITS.FREE.storageBytes)} total file storage`,
      `Uploads up to ${maxFileSize} per file · ${UPLOAD_LIMITS.FREE.requestsPerMinute} uploads/minute`,
      "Accordion-style course builder",
      "Shareable public link with LessonMap branding",
      "View-only Flow map with LessonMap watermark",
      "Roadmap cloning and basic visit/start counts",
    ],
  },
  {
    name: "Creator Plan",
    type: "CREATOR",
    description:
      "Publish polished roadmaps, collect leads, and share without branding.",
    price: "$15",
    period: "/month",
    isPopular: true,
    cta: "Start Creator Plan",
    accent: "Early-bird",
    features: [
      `${COURSE_LIMITS.CREATOR} course maps`,
      `${AI_LIMITS.CREATOR.generations} AI generations/month · full multi-module courses (Only successful AI generations count, failed attempts are never charged)`,
      "Unlimited modules and lessons in every course",
      `${formatStorageLimit(UPLOAD_LIMITS.CREATOR.storageBytes)} total file storage`,
      `Uploads up to ${maxFileSize} per file · ${UPLOAD_LIMITS.CREATOR.requestsPerMinute} uploads/minute`,
      "Accordion view + Flow / node-like view",
      "Export courses as Markdown, accordion PDF, and Flow PDF or PNG",
      "Shareable links without LessonMap branding",
      "Social and website links on your public course pages",
      "Email capture with lead list and CSV export",
    ],
  },
];

export const comparisonRows = [
  {
    label: "Course maps",
    free: `Up to ${COURSE_LIMITS.FREE}`,
    creator: COURSE_LIMITS.CREATOR === "Unlimited"
      ? COURSE_LIMITS.CREATOR
      : `Up to ${COURSE_LIMITS.CREATOR}`,
  },
  {
    label: "AI outline generation",
    free: "One complete outline per account · one-time allowance",
    creator: `${AI_LIMITS.CREATOR.generations} generations/month · full multi-module courses`,
  },
  {
    label: "Failed AI generations",
    free: "Never counted against your limit",
    creator: "Never counted against your limit",
  },
  {
    label: "Total file storage",
    free: formatStorageLimit(UPLOAD_LIMITS.FREE.storageBytes),
    creator: formatStorageLimit(UPLOAD_LIMITS.CREATOR.storageBytes),
  },
  {
    label: "Maximum file size",
    free: maxFileSize,
    creator: maxFileSize,
  },
  {
    label: "Upload rate",
    free: `${UPLOAD_LIMITS.FREE.requestsPerMinute} uploads/minute`,
    creator: `${UPLOAD_LIMITS.CREATOR.requestsPerMinute} uploads/minute`,
  },
  {
    label: "Export options",
    free: "Not included",
    creator: "Markdown + accordion PDF + Flow PDF / PNG",
  },
  {
    label: "Builder style",
    free: "Accordion + view-only, watermarked Flow",
    creator: "Accordion + Flow / node-like map",
  },
  {
    label: "Shareable links",
    free: "Yes, with LessonMap branding",
    creator: "Yes, without branding",
  },
  {
    label: "Social and website links",
    free: "Not included",
    creator: "Instagram, LinkedIn, YouTube, GitHub, X, and your website",
  },
  {
    label: "Email capture",
    free: "Not included",
    creator: "Signup form, lead list, and CSV export",
  },
  {
    label: "Visits and lesson starts",
    free: "Basic counts",
    creator: "Basic counts",
  },
  {
    label: "Best for",
    free: "Testing and first course ideas",
    creator: "Publishing, sharing, and growing your audience",
  },
];

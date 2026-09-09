import { AI_LIMITS } from "@/lib/ai/schema";
import { COURSE_LIMITS } from "@/lib/plans";

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
    name: "Free",
    type: "FREE",
    description:
      "For first-time creators who want to test the idea, map a few lessons, and share a simple course outline.",
    price: "$0",
    period: "/month",
    cta: "Start Free",
    accent: "Starter",
    features: [
      `${COURSE_LIMITS.FREE} course maps`,
      `${AI_LIMITS.FREE.monthlyAttempts} AI attempts/month: 1 module and 1 lesson per course`,
      "Accordion-style course builder",
      "Shareable public link with LessonMap branding",
      "Basic customization and editing",
    ],
  },
  {
    name: "Creator",
    type: "CREATOR",
    description:
      "For creators who want a polished, shareable, and more visual course map with AI support and creator-native branding.",
    price: "$12",
    period: "/month",
    isPopular: true,
    cta: "Start Creator Plan",
    accent: "Most Popular",
    features: [
      `${COURSE_LIMITS.CREATOR} course maps`,
      `${AI_LIMITS.CREATOR.monthlyAttempts} AI attempts/month: full course outlines`,
      "Unlimited modules and lessons in every course",
      "Accordion view + Flow / node-like view",
      "Shareable links without LessonMap branding",
      "Creator-native branding and social-ready presentation",
      "Advanced customization, themes, and export-ready structure",
    ],
  },
];

export const comparisonRows = [
  {
    label: "Course maps",
    free: `Up to ${COURSE_LIMITS.FREE}`,
    creator: `Up to ${COURSE_LIMITS.CREATOR}`,
  },
  {
    label: "AI outline generation",
    free: `${AI_LIMITS.FREE.monthlyAttempts} attempts/month · 1 module, 1 lesson`,
    creator: `${AI_LIMITS.CREATOR.monthlyAttempts} attempts/month · full outlines`,
  },
  {
    label: "Builder style",
    free: "Accordion view",
    creator: "Accordion + Flow / node-like map",
  },
  {
    label: "Shareable links",
    free: "Yes, with LessonMap branding",
    creator: "Yes, without branding",
  },
  {
    label: "Customization",
    free: "Basic",
    creator: "Advanced themes & creator-native polish",
  },
  {
    label: "Social / creator branding",
    free: "Limited",
    creator: "Full creator-native presentation",
  },
  {
    label: "Best for",
    free: "Testing and first course ideas",
    creator: "Publishing, sharing, and growing your audience",
  },
];

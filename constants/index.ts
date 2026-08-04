export const exampleCourses = [
  {
    id: "1",
    title: "Data Science with Python",
    description: "Become a professional Data Scientist",
    outline: [
      "Introduction to Data Science",
      "Data Collection and Cleaning",
      "Exploratory Data Analysis (EDA)",
      "Python Libraries (Pandas, NumPy)",
      "Machine Learning Algorithms",
      "Data Visualization",
    ],
  },
  {
    id: "2",
    title: "Complete Web Development",
    description: "Build modern web applications",
    outline: [
      "HTML, CSS, and JavaScript Basics",
      "React Ecosystem",
      "Node.js and Express",
      "Databases (SQL & NoSQL)",
      "Deployment",
      "Project: E-Commerce Site",
    ],
  },
];

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
      "3 public course maps",
      "Basic AI outline generation",
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
      "Unlimited course maps",
      "Unlimited AI generations",
      "Accordion view + Flow / node-like view",
      "Shareable links without LessonMap branding",
      "Creator-native branding and social-ready presentation",
      "Advanced customization, themes, and export-ready structure",
    ],
  },
];

export const comparisonRows = [
  {
    label: "Public course maps",
    free: "Up to 3",
    creator: "Unlimited",
  },
  {
    label: "AI outline generation",
    free: "Basic",
    creator: "Unlimited + smarter drafts",
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

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Course Outline Examples and Templates",
  description:
    "Explore editable course-outline examples with organized modules and lessons, then use a template to plan your own course in LessonMap.",
  alternates: { canonical: "/examples" },
  openGraph: {
    title: "Course Outline Examples and Templates | LessonMap",
    description: "Browse structured course examples and turn one into your own editable outline.",
    url: "/examples",
  },
};

export default function ExamplesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

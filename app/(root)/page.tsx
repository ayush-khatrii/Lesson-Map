import type { Metadata } from "next";
import LandingPage from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "LessonMap — Give your course a clear path",
  description: "Organize modules and lessons, add learning resources, and share your course with a single link. A simple workspace for planning what you teach.",
};

export default function Page() {
  return <LandingPage />;
}

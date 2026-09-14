import type { Metadata } from "next";
import LandingPage from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "LessonMap — Build and Share Online Courses",
  description: "Plan modules and lessons, add notes and learning resources, and share your course with one link. Learners can follow the course without creating an account.",
};

export default function Page() {
  return <LandingPage />;
}

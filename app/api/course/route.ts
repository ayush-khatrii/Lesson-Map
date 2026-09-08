import { getUserCourses } from "@/lib/course-cache";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Get all courses with their modules
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userID = session?.session.userId;
  if (!userID) {
    return NextResponse.json(
      { error: "Unauthorized! Please login to continue" },
      { status: 401 }
    );
  }
  try {
    const courses = await getUserCourses(userID);
    return NextResponse.json(courses ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch courses", details: error },
      { status: 500 }
    );
  }
}

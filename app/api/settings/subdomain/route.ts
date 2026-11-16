import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { sessionUserId, launchError } from "@/lib/launch-access";
import { effectiveAiPlan } from "@/lib/ai/schema";
import { validSubdomain } from "@/lib/subdomain";
import { isSameOriginRequest } from "@/lib/payments/request-security";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request))
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    const userId = await sessionUserId();
    if (!userId)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || effectiveAiPlan(user) === "FREE")
      return NextResponse.json(
        { error: "Creator is required for subdomains." },
        { status: 403 },
      );
    const body = await request.json().catch(() => null);
    const subdomain =
      typeof body?.subdomain === "string"
        ? body.subdomain.trim().toLowerCase()
        : "";
    if (!validSubdomain(subdomain))
      return NextResponse.json(
        {
          error:
            "Use 3–30 lowercase letters, numbers or hyphens. This name may be reserved.",
        },
        { status: 400 },
      );
    await db.user.update({ where: { id: userId }, data: { subdomain } });
    return NextResponse.json({ subdomain });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      return NextResponse.json(
        { error: "That subdomain is already taken." },
        { status: 409 },
      );
    return launchError(error);
  }
}

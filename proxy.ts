import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// ─── Route Definitions ──────────────────────────────────────────────────────

// Pages that require authentication — unauthenticated users get redirected to /sign-in
const PROTECTED_PAGES = ["/dashboard", "/outline", "/settings"];

// Auth pages — authenticated users get redirected to /dashboard
const AUTH_PAGES = ["/sign-in", "/sign-up"];

// API routes that require authentication — unauthenticated requests get 401 JSON
const PROTECTED_API_ROUTES = [
  "/api/course",
  "/api/module",
  "/api/lesson",
  "/api/checkout",
  "/api/subscription",
];

// API routes that are always public (no auth check)
const PUBLIC_API_ROUTES = ["/api/auth", "/api/webhooks", "/api/examples"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

// ─── Proxy (Middleware) ──────────────────────────────────────────────────────

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optimistic session check via cookie (fast, no DB call)
  // This checks for the existence of the BetterAuth session cookie.
  // Deep validation still happens inside Server Components & API Route Handlers.
  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = !!sessionCookie;

  // ── 1. Public API routes — always allow (auth handler, webhooks, examples)
  if (isPublicApiRoute(pathname)) {
    return NextResponse.next();
  }

  // ── 2. Protected API routes — return 401 JSON if unauthenticated
  if (isProtectedApiRoute(pathname)) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to access this resource." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // ── 3. Auth pages (sign-in, sign-up) — redirect TO dashboard if already logged in
  if (isAuthPage(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // ── 4. Protected pages (dashboard, outline) — redirect TO sign-in if not logged in
  if (isProtectedPage(pathname)) {
    if (!isAuthenticated) {
      // Preserve the original URL so we can redirect back after login
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  // ── 5. All other routes (landing page, pricing, etc.) — public, allow through
  return NextResponse.next();
}

// ─── Matcher ─────────────────────────────────────────────────────────────────
// Match all routes EXCEPT static files, images, and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Static asset file extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)",
  ],
};

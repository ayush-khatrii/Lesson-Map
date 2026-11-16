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
  const mainOrigin = process.env.NEXT_PUBLIC_BASE_URL || "https://lessonmap.org";
  const mainHost = new URL(mainOrigin).hostname;
  const host = request.nextUrl.hostname;
  const tenant = host.endsWith(`.${mainHost}`) && host !== `www.${mainHost}`
    ? host.slice(0, -(mainHost.length + 1)) : null;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-lessonmap-subdomain");
  if (tenant) {
    if (!/^[a-z0-9-]+$/.test(tenant)) return new NextResponse("Not found", { status: 404 });
    requestHeaders.set("x-lessonmap-subdomain", tenant);
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/creators/${tenant}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    if (pathname.startsWith("/p/") || pathname.startsWith("/api/public/") || pathname === "/api/auth/get-session") {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, mainOrigin));
  }
  // Always overwrite the tenant header; callers cannot choose another tenant.
  if (pathname.startsWith("/p/")) return NextResponse.next({ request: { headers: requestHeaders } });

  // Admin authentication uses a separate cookie and backend guard. In particular,
  // the public app's session cookie must never grant or gate dashboard access.
  if (pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/") || pathname === "/api/admin" || pathname.startsWith("/api/admin/")) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Referrer-Policy", "same-origin");
    response.headers.set("X-Frame-Options", "DENY");
    return response;
  }

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

  // Auth pages validate the session against the database themselves.
  // Cookie presence alone cannot establish whether a session is still valid.
  if (isAuthPage(pathname)) return NextResponse.next();

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

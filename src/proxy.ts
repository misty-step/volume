import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COACH_HOME_PATH } from "@/lib/coach/routes";
import { buildContentSecurityPolicy } from "@/lib/content-security-policy";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Analytics proxy (PostHog /ingest rewrite)
  // Use separate patterns to avoid over-matching /ingest-data, /ingestion, etc.
  "/ingest",
  "/ingest/(.*)",
  // Legal pages
  "/terms",
  "/privacy",
  // Pricing page (accessible to non-authenticated users)
  "/pricing",
  // Next.js metadata routes (must be accessible to crawlers/bots)
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
  "/icon",
  "/apple-icon",
  // Health check for uptime monitoring
  "/api/health",
  // Public release notes
  "/releases",
  "/releases/(.*)",
]);

const cspHeader = buildContentSecurityPolicy({
  canaryEndpoint: process.env.NEXT_PUBLIC_CANARY_ENDPOINT,
  includeUpgradeInsecureRequests: process.env.NODE_ENV === "production",
});

const applySecurityHeaders = (response: NextResponse) => {
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  return response;
};

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Signed-in visitors hitting marketing root should skip the landing page entirely
  if (request.nextUrl.pathname === "/") {
    const session = await auth();
    if (session.userId) {
      const redirectUrl = new URL(COACH_HOME_PATH, request.url);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      return applySecurityHeaders(redirectResponse);
    }
  }

  // Protect non-public routes with Clerk authentication
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  return applySecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and analytics proxy
    // ingest(?:/|$) scopes exclusion to /ingest and /ingest/... only.
    "/((?!_next|ingest(?:/|$)|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

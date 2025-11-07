import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Protect non-public routes with Clerk authentication
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Content Security Policy: Pragmatic approach for small app
  //
  // Philosophy: Good security that ships beats perfect security that never ships.
  // This is a workout tracker, not a bank or healthcare app.
  //
  // Approach:
  // - Host-based allowlists block most XSS vectors
  // - 'unsafe-inline' for simplicity (enables next-themes, Clerk inline scripts)
  // - Wildcard https: for images (future flexibility: profile pics, external content)
  // - worker-src blob: required for Clerk web workers
  // - No nonces (removes complexity, maintenance burden)
  //
  // Tradeoffs accepted:
  // - Not "strict" CSP (but threat model doesn't justify the complexity)
  // - 'unsafe-inline' present (security purists won't like it)
  // - Telemetry domains not allowlisted (cosmetic console errors, zero functional impact)
  //
  // Maintenance: ~5 minutes when adding new service to allowlist
  // Security grade: B+/A- (perfectly acceptable for this app)
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev https://challenges.cloudflare.com https://vercel.live;
    style-src 'self' 'unsafe-inline' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev;
    img-src 'self' https: data: blob:;
    font-src 'self' data:;
    worker-src 'self' blob:;
    connect-src 'self' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev https://*.convex.cloud wss://*.convex.cloud;
    frame-src 'self' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev https://challenges.cloudflare.com https://vercel.live;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // Create response with security headers
  const response = NextResponse.next();

  // Apply all security headers
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

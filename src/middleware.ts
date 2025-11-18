import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Next.js metadata routes (must be accessible to crawlers/bots)
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
  "/icon",
  "/apple-icon",
]);

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev https://challenges.cloudflare.com https://vercel.live https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev;
  img-src 'self' https: data: blob:;
  font-src 'self' data:;
  worker-src 'self' blob:;
  connect-src 'self' https://*.clerk.com https://clerk.volume.fitness https://*.clerk.accounts.dev https://*.convex.cloud wss://*.convex.cloud https://va.vercel-scripts.com https://vitals.vercel-insights.com https://clerk-telemetry.com;
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
      const redirectUrl = new URL("/today", request.url);
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
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

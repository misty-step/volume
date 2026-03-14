import { LOCAL_BUILD_CONVEX_URL } from "./public-service-config.shared";

function readPublicConvexUrl(): string | undefined {
  // Literal access is required so Next.js/Turbopack can expose the value
  // to browser bundles instead of dropping it during compilation.
  const value = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  return value || undefined;
}

function isHostedSsrRuntime(): boolean {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV?.trim();
  return vercelEnv === "preview" || vercelEnv === "production";
}

function isLocalClientRuntime(): boolean {
  if (typeof window === "undefined") {
    return !isHostedSsrRuntime();
  }

  const hostname = window.location.hostname.toLowerCase();
  return ["", "localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

export function getClientConvexUrl(): string {
  const convexUrl = readPublicConvexUrl();

  if (convexUrl) {
    return convexUrl;
  }

  if (!isLocalClientRuntime()) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL for hosted client runtime");
  }

  return LOCAL_BUILD_CONVEX_URL;
}

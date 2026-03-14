import { LOCAL_BUILD_CONVEX_URL } from "./public-service-config.shared";

function getTrimmedPublicEnv(key: `NEXT_PUBLIC_${string}`): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function isHostedSsrRuntime(): boolean {
  const vercelEnv = getTrimmedPublicEnv("NEXT_PUBLIC_VERCEL_ENV");
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
  const convexUrl = getTrimmedPublicEnv("NEXT_PUBLIC_CONVEX_URL");

  if (convexUrl) {
    return convexUrl;
  }

  if (!isLocalClientRuntime()) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL for hosted client runtime");
  }

  return LOCAL_BUILD_CONVEX_URL;
}

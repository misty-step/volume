import { Buffer } from "node:buffer";

const LOCAL_BUILD_CLERK_FRONTEND_API = "local-build.clerk.accounts.dev";
const LOCAL_BUILD_CONVEX_URL = "https://local-build.convex.cloud";

function getTrimmedEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function isHostedVercelBuild(): boolean {
  const vercelEnv = getTrimmedEnv("VERCEL_ENV");
  return vercelEnv === "preview" || vercelEnv === "production";
}

function buildClerkPublishableKey(frontendApi: string): string {
  return `pk_test_${Buffer.from(`${frontendApi}$`).toString("base64")}`;
}

export function getClientClerkPublishableKey(): string {
  const publishableKey = getTrimmedEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");

  if (publishableKey) {
    return publishableKey;
  }

  if (isHostedVercelBuild()) {
    throw new Error(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY for hosted Vercel build"
    );
  }

  return buildClerkPublishableKey(LOCAL_BUILD_CLERK_FRONTEND_API);
}

export function getClientConvexUrl(): string {
  const convexUrl = getTrimmedEnv("NEXT_PUBLIC_CONVEX_URL");

  if (convexUrl) {
    return convexUrl;
  }

  if (isHostedVercelBuild()) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL for hosted Vercel build");
  }

  return LOCAL_BUILD_CONVEX_URL;
}

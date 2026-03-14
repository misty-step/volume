import "server-only";

import { Buffer } from "node:buffer";
import { LOCAL_BUILD_CLERK_FRONTEND_API } from "./public-service-config.shared";

function readPublicClerkPublishableKey(): string | undefined {
  // Literal access is required so Next.js/Turbopack keeps the value available
  // in the app bundle instead of treating it as an opaque runtime lookup.
  const value = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  return value || undefined;
}

function buildClerkPublishableKey(frontendApi: string): string {
  return `pk_test_${Buffer.from(`${frontendApi}$`).toString("base64")}`;
}

function isHostedServerBuild(): boolean {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  return vercelEnv === "preview" || vercelEnv === "production";
}

export function getServerClerkPublishableKey(): string {
  const publishableKey = readPublicClerkPublishableKey();

  if (publishableKey) {
    return publishableKey;
  }

  if (isHostedServerBuild()) {
    throw new Error(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY for hosted server build"
    );
  }

  return buildClerkPublishableKey(LOCAL_BUILD_CLERK_FRONTEND_API);
}

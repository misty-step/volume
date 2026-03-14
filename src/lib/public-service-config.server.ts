import "server-only";

import { Buffer } from "node:buffer";
import { LOCAL_BUILD_CLERK_FRONTEND_API } from "./public-service-config.shared";

function getTrimmedEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function buildClerkPublishableKey(frontendApi: string): string {
  return `pk_test_${Buffer.from(`${frontendApi}$`).toString("base64")}`;
}

function isHostedServerBuild(): boolean {
  const vercelEnv = getTrimmedEnv("VERCEL_ENV");
  return vercelEnv === "preview" || vercelEnv === "production";
}

export function getServerClerkPublishableKey(): string {
  const publishableKey = getTrimmedEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");

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

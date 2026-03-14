import "server-only";

import {
  buildClerkPublishableKey,
  getTrimmedEnv,
  LOCAL_BUILD_CLERK_FRONTEND_API,
} from "./public-service-config.shared";

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

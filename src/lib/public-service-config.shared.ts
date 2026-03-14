import { Buffer } from "node:buffer";

export const LOCAL_BUILD_CLERK_FRONTEND_API = "local-build.clerk.accounts.dev";
export const LOCAL_BUILD_CONVEX_URL = "https://local-build.convex.cloud";

export function getTrimmedEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

export function buildClerkPublishableKey(frontendApi: string): string {
  return `pk_test_${Buffer.from(`${frontendApi}$`).toString("base64")}`;
}

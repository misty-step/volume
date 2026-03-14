import {
  buildClerkPublishableKey,
  getTrimmedEnv,
  LOCAL_BUILD_CLERK_FRONTEND_API,
  LOCAL_BUILD_CONVEX_URL,
} from "./public-service-config.shared";

function isLocalBrowserRuntime(): boolean {
  if (typeof window === "undefined") return true;

  const hostname = window.location.hostname.toLowerCase();
  return ["", "localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

export function getClientClerkPublishableKey(): string {
  const publishableKey = getTrimmedEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");

  if (publishableKey) {
    return publishableKey;
  }

  if (!isLocalBrowserRuntime()) {
    throw new Error(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY for hosted client runtime"
    );
  }

  return buildClerkPublishableKey(LOCAL_BUILD_CLERK_FRONTEND_API);
}

export function getClientConvexUrl(): string {
  const convexUrl = getTrimmedEnv("NEXT_PUBLIC_CONVEX_URL");

  if (convexUrl) {
    return convexUrl;
  }

  if (!isLocalBrowserRuntime()) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL for hosted client runtime");
  }

  return LOCAL_BUILD_CONVEX_URL;
}

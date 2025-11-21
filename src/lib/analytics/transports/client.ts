import { track as vercelTrack } from "@vercel/analytics";

/**
 * Wrapper for Vercel Analytics client-side tracking.
 *
 * Mirrors the server adapter signature while allowing optional
 * Playwright stubbing when NEXT_PUBLIC_ANALYTICS_STUB is true.
 *
 * @param name - Event name
 * @param properties - Event properties
 */
export function trackClient(
  name: string,
  properties: Record<string, string | number | boolean> = {}
): void {
  const maybeWindow =
    typeof window !== "undefined" ? (window as unknown) : null;
  const stub = (maybeWindow as { __ANALYTICS__?: { state?: any } } | null)
    ?.__ANALYTICS__;

  if (stub?.state) {
    stub.state.events.push({
      name,
      props: properties,
      runtime: "client",
    });
  }

  if (process.env.NEXT_PUBLIC_ANALYTICS_STUB === "true") {
    return;
  }

  vercelTrack(name, properties);
}

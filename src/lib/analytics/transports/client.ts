import { track as vercelTrack } from "@vercel/analytics";

/**
 * Wrapper for Vercel Analytics client-side tracking.
 *
 * @param name - Event name
 * @param properties - Event properties
 */
export function trackClient(
  name: string,
  properties?: Record<string, string | number | boolean>
): void {
  vercelTrack(name, properties);
}

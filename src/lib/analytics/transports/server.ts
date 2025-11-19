/**
 * Cached promise for server-side track function.
 *
 * Prevents multiple dynamic imports of @vercel/analytics/server.
 */
let serverTrackPromise: Promise<
  typeof import("@vercel/analytics/server").track | null
> | null = null;

/**
 * Dynamically load Vercel Analytics server track function.
 *
 * Only works on server - returns null on client to prevent errors.
 * Caches the import promise to avoid repeated dynamic imports.
 *
 * @returns Promise resolving to track function on server, null on client
 */
export function loadServerTrack() {
  // Client-side check - return null immediately
  if (typeof window !== "undefined") return Promise.resolve(null);

  // Server-side - load once and cache
  if (!serverTrackPromise) {
    serverTrackPromise = import("@vercel/analytics/server")
      .then((m) => m.track)
      .catch(() => null);
  }

  return serverTrackPromise;
}

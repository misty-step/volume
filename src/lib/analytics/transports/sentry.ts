import { shouldEnableSentry as checkSentryEnabled } from "../../sentry";

/**
 * Check if Sentry error tracking should be enabled.
 *
 * Delegates to existing shouldEnableSentry helper from lib/sentry.ts.
 *
 * @returns true if Sentry should report errors
 */
export function isSentryEnabled(): boolean {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  return checkSentryEnabled(dsn);
}

/**
 * Type-safe analytics event catalog.
 *
 * Serves as the single source of truth for all trackable events so
 * TypeScript can prevent typos and enforce required properties.
 */
export interface AnalyticsEventDefinitions {
  "Exercise Created": {
    exerciseId: string;
    userId?: string;
    source?: "manual" | "ai" | "import";
  };
  "Set Logged": {
    setId: string;
    exerciseId: string;
    userId?: string;
    reps: number;
    weight?: number;
  };
  "Workout Session Started": {
    sessionId: string;
    userId?: string;
  };
  "Workout Session Completed": {
    sessionId: string;
    userId?: string;
    durationMs: number;
    setCount: number;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventDefinitions;

/**
 * Event-specific property helper.
 *
 * Consumers can pass the strongly typed properties while the helper
 * still allows additional metadata fields (string/number/boolean).
 */
export type AnalyticsEventProperties<Name extends AnalyticsEventName> = Partial<
  AnalyticsEventDefinitions[Name]
> &
  Record<string, string | number | boolean>;

/**
 * Redact email addresses from strings to protect PII.
 *
 * Replaces all email patterns with [EMAIL_REDACTED]. Some emails may be
 * double-redacted if they appear in already-redacted text (defensive behavior).
 *
 * @example
 * sanitizeString("user@example.com sent message")
 * // => "[EMAIL_REDACTED] sent message"
 */
function sanitizeString(value: string): string {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return value.replace(emailPattern, "[EMAIL_REDACTED]");
}

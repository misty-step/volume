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

/**
 * Sanitize event properties to remove PII.
 *
 * Type system enforces flat objects with primitives only, so no recursion needed.
 *
 * - Strings: Email redaction via sanitizeString()
 * - Numbers/booleans: Pass through unchanged
 * - null/undefined: Skip
 * - Other types: Convert to string and sanitize
 *
 * @param properties - Raw event properties that may contain PII
 * @returns Sanitized properties safe for analytics transmission
 *
 * @example
 * sanitizeEventProperties({
 *   userId: "user@example.com",
 *   count: 42,
 *   isActive: true
 * })
 * // => { userId: "[EMAIL_REDACTED]", count: 42, isActive: true }
 */
function sanitizeEventProperties(
  properties: Record<string, unknown>
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(properties)) {
    // Skip null/undefined
    if (value == null) {
      continue;
    }

    // Pass through primitives
    if (typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
      continue;
    }

    // Everything else becomes a sanitized string
    result[key] = sanitizeString(String(value));
  }

  return result;
}

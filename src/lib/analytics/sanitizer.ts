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
export function sanitizeString(value: string): string {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return value.replace(emailPattern, "[EMAIL_REDACTED]");
}

/**
 * Sanitize event properties to remove PII.
 *
 * Handles nested objects, arrays, and circular references safely:
 * - Strings: Email redaction via sanitizeString()
 * - Numbers/booleans: Pass through unchanged
 * - null/undefined: Skip
 * - Objects/Arrays: JSON.stringify then sanitize (preserves structure)
 * - Circular references: Marked as "[Circular]"
 *
 * @param properties - Raw event properties that may contain PII
 * @returns Sanitized properties safe for analytics transmission
 *
 * @example
 * sanitizeProperties({
 *   userId: "user@example.com",
 *   count: 42,
 *   isActive: true,
 *   metadata: { email: "test@example.com", plan: "pro" }
 * })
 * // => {
 * //   userId: "[EMAIL_REDACTED]",
 * //   count: 42,
 * //   isActive: true,
 * //   metadata: '{"email":"[EMAIL_REDACTED]","plan":"pro"}'
 * // }
 */
export function sanitizeProperties(
  properties: Record<string, unknown>
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  const seen = new WeakSet();

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

    // Handle nested objects/arrays
    if (typeof value === "object") {
      // Detect circular references
      if (seen.has(value)) {
        result[key] = "[Circular]";
        continue;
      }
      seen.add(value);

      // JSON.stringify then sanitize to preserve structure
      try {
        result[key] = sanitizeString(JSON.stringify(value));
      } catch (error) {
        // Fallback for unstringifiable objects (e.g., functions, symbols)
        result[key] = "[Unstringifiable Object]";
      }
      continue;
    }

    // Everything else becomes a sanitized string
    result[key] = sanitizeString(String(value));
  }

  return result;
}

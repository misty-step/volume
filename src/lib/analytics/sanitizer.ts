/**
 * Redact email addresses from strings to protect PII.
 *
 * Replaces all email patterns with [EMAIL_REDACTED].
 * Idempotent: Does not re-redact already redacted text.
 *
 * @example
 * sanitizeString("user@example.com sent message")
 * // => "[EMAIL_REDACTED] sent message"
 */
export function sanitizeString(value: string): string {
  // If the string is already just the redaction token, return it
  if (value === "[EMAIL_REDACTED]") return value;

  // If it contains the token, we might still want to redact other emails,
  // but we should be careful not to double-redact if the regex matches the token.
  // The regex below expects @ and ., so [EMAIL_REDACTED] won't match.
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return value.replace(emailPattern, "[EMAIL_REDACTED]");
}

/**
 * Ensure a string is valid UTF-8.
 *
 * Uses toWellFormed() if available (Node 20+), otherwise falls back to
 * TextEncoder/Decoder roundtrip to replace invalid sequences.
 */
function ensureValidUTF8(str: string): string {
  if (typeof str.toWellFormed === "function") {
    return str.toWellFormed();
  }

  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    return decoder.decode(encoder.encode(str));
  } catch {
    return "[INVALID_UTF8]";
  }
}

const MAX_PAYLOAD_BYTES = 4096;

/**
 * Sanitize event properties to remove PII and ensure safe transport.
 *
 * Features:
 * - Recursive PII redaction (emails)
 * - Circular reference handling
 * - UTF-8 validation
 * - Payload size limit (4KB)
 * - Type normalization (flattens objects to JSON strings)
 *
 * @param properties - Raw event properties
 * @returns Sanitized properties or dropped reason
 */
export function sanitizeProperties(
  properties: Record<string, unknown>
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  const seen = new WeakSet();

  // Add root object to seen to detect immediate recursion
  if (properties && typeof properties === "object") {
    seen.add(properties);
  }

  // Helper for recursive cleaning within JSON.stringify
  const replacer = (key: string, value: unknown) => {
    if (value == null) return value;

    if (typeof value === "object") {
      if (seen.has(value as object)) {
        return "[Circular]";
      }
      seen.add(value as object);
    }

    if (typeof value === "string") {
      return sanitizeString(ensureValidUTF8(value));
    }

    // Unsupported types
    if (typeof value === "function" || typeof value === "symbol") {
      return `[Unsupported:${typeof value}]`;
    }

    return value;
  };

  for (const [key, value] of Object.entries(properties)) {
    // Skip null/undefined top-level keys
    if (value == null) continue;

    // Pass through safe primitives
    if (typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
      continue;
    }

    // Strings: Sanitize + UTF-8 check
    if (typeof value === "string") {
      result[key] = sanitizeString(ensureValidUTF8(value));
      continue;
    }

    // Objects/Arrays: Stringify with sanitizing replacer
    if (typeof value === "object") {
      // Note: We rely on the replacer to handle 'seen' tracking.
      // If we added to 'seen' here, the first call to replacer (for the root object)
      // would immediately see it and return "[Circular]".

      // However, we DO need to handle if 'value' was seen in a PREVIOUS property iteration.
      if (seen.has(value)) {
        result[key] = "[Circular]";
        continue;
      }

      // We don't add to seen here; the replacer will do it when processing the root.
      // But wait, replacer is called for the root.
      // If we don't add it to 'seen' here, and the replacer adds it...
      // Then subsequent properties in the OUTER loop need to know it's seen.
      // BUT 'seen' is shared.
      // So replacer adds it. Then next iteration of outer loop checks seen.has(value).
      // This works.

      try {
        result[key] = JSON.stringify(value, replacer);
      } catch (error) {
        result[key] = "[Unstringifiable Object]";
      }
      continue;
    }

    // Fallback for other types
    result[key] = String(value);
  }

  // Payload size guard
  try {
    const payloadString = JSON.stringify(result);
    // Simple byte size approximation (length in chars is close enough for safeguard)
    if (payloadString.length > MAX_PAYLOAD_BYTES) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[Telemetry] Payload too large (${payloadString.length} bytes), dropping event.`
        );
      }
      return { droppedReason: "payload_too_large" };
    }
  } catch {
    // Should be impossible since we just built it, but defensive coding
    return { droppedReason: "payload_serialization_failed" };
  }

  return result;
}

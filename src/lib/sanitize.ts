/**
 * PII sanitization utilities.
 *
 * Single source of truth for data sanitization across observability modules.
 */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EMAIL_REDACTED = "[EMAIL_REDACTED]";

export function sanitizeEmail(value: string): string {
  return value.replace(EMAIL_PATTERN, EMAIL_REDACTED);
}


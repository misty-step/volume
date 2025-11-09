import type {
  Breadcrumb,
  BrowserOptions,
  Event,
  EventHint,
} from "@sentry/nextjs";

import { getDeploymentEnvironment } from "./environment";

/**
 * Sentry configuration factory with comprehensive PII scrubbing.
 *
 * Centralizes all privacy protection logic behind a simple interface.
 * Every Sentry event passes through sanitization before transmission.
 */

// PII Protection Constants
const EMAIL_REDACTION_PATTERN =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?<!\[EMAIL_REDACTED\])/g;
const EMAIL_REDACTED = "[EMAIL_REDACTED]";
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
]);

// Default Sampling Rates
const DEFAULT_TRACES_SAMPLE_RATE = 0.1;
const DEFAULT_REPLAYS_SESSION_SAMPLE_RATE = 0.05;
const DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE = 1.0;

export type SentryTarget = "client" | "server" | "edge";

/**
 * Parse sample rate from environment variable with validation.
 *
 * @param value - Environment variable value
 * @param fallback - Default value if parsing fails
 * @returns Valid sample rate between 0.0 and 1.0
 */
function parseSampleRate(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return fallback;

  // Clamp to valid range [0.0, 1.0]
  return Math.min(Math.max(parsed, 0), 1);
}

/**
 * Sanitize string by redacting email addresses.
 *
 * @param value - Input string
 * @returns String with emails replaced by [EMAIL_REDACTED]
 */
function sanitizeString(value: string): string {
  return value.replace(EMAIL_REDACTION_PATTERN, EMAIL_REDACTED);
}

/**
 * Remove sensitive headers from request/response headers object.
 *
 * Mutates the headers object in place.
 *
 * @param headers - Headers object to sanitize
 * @returns Sanitized headers object (same reference)
 */
function sanitizeHeaders(
  headers: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!headers) return headers;

  for (const [key, rawValue] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase();

    // Remove sensitive headers entirely
    if (SENSITIVE_HEADERS.has(normalizedKey)) {
      delete headers[key];
      continue;
    }

    // Sanitize string values
    if (typeof rawValue === "string") {
      headers[key] = sanitizeString(rawValue);
      continue;
    }

    // Sanitize array values
    if (Array.isArray(rawValue)) {
      headers[key] = rawValue.map((item) =>
        typeof item === "string" ? sanitizeString(item) : item
      );
    }
  }

  return headers;
}

/**
 * Recursively sanitize values with circular reference detection.
 *
 * @param value - Value to sanitize
 * @param seen - WeakSet for circular reference tracking
 * @returns Sanitized value
 */
function sanitizeValue<T>(value: T, seen: WeakSet<object>): T {
  if (!value) return value;

  if (typeof value === "string") {
    return sanitizeString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen)) as T;
  }

  if (typeof value === "object") {
    // Detect circular references
    if (seen.has(value as object)) {
      return value;
    }

    seen.add(value as object);
    const record = value as Record<string, unknown>;

    for (const [key, entry] of Object.entries(record)) {
      record[key] = sanitizeValue(entry, seen);
    }
  }

  return value;
}

/**
 * Sanitize Sentry event before transmission.
 *
 * Removes PII from:
 * - User email and IP address
 * - Request headers and data
 * - Context, extra, and tags
 * - Primary display strings (message, exception values, URLs)
 *
 * @param event - Sentry event object
 * @returns Sanitized event (may return null to drop event)
 */
export function sanitizeEvent(event: Event, _hint?: EventHint): Event | null {
  const seen = new WeakSet<object>();

  // Scrub user identifiable information
  if (event.user) {
    if (event.user.email) {
      event.user.email = EMAIL_REDACTED;
    }
    if (event.user.ip_address) {
      delete event.user.ip_address;
    }
  }

  // Scrub request information
  if (event.request) {
    event.request.headers = sanitizeHeaders(event.request.headers) as
      | Record<string, string>
      | undefined;

    event.request.query_string =
      typeof event.request.query_string === "string"
        ? sanitizeString(event.request.query_string)
        : event.request.query_string;

    if (event.request.data) {
      event.request.data = sanitizeValue(event.request.data, seen);
    }

    // Sanitize cookies (may contain session tokens and PII)
    if (event.request.cookies) {
      event.request.cookies = sanitizeValue(
        event.request.cookies,
        seen
      ) as Record<string, string>;
    }

    // Sanitize request URL (may contain tokens/emails in query params)
    if (typeof event.request.url === "string") {
      event.request.url = sanitizeString(event.request.url);
    }
  }

  // Scrub primary display strings
  if (typeof event.message === "string") {
    event.message = sanitizeString(event.message);
  }

  if (event.logentry?.message && typeof event.logentry.message === "string") {
    event.logentry.message = sanitizeString(event.logentry.message);
  }

  // Scrub exception values and stack traces
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (typeof exception.value === "string") {
        exception.value = sanitizeString(exception.value);
      }

      // Sanitize stack trace frames (may contain PII in locals/args)
      if (exception.stacktrace?.frames) {
        for (const frame of exception.stacktrace.frames) {
          // Sanitize frame locals and vars
          if (frame.vars) {
            frame.vars = sanitizeValue(frame.vars, seen);
          }
        }
      }
    }
  }

  // Scrub contextual data
  if (event.contexts) {
    event.contexts = sanitizeValue(event.contexts, seen);
  }

  if (event.extra) {
    event.extra = sanitizeValue(event.extra, seen);
  }

  if (event.tags) {
    event.tags = sanitizeValue(event.tags, seen);
  }

  return event;
}

/**
 * Sanitize breadcrumb data.
 *
 * @param breadcrumb - Breadcrumb to sanitize
 * @returns Sanitized breadcrumb (may return null to drop breadcrumb)
 */
export function sanitizeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (!breadcrumb) return breadcrumb;

  const seen = new WeakSet<object>();

  if (breadcrumb.data) {
    breadcrumb.data = sanitizeValue(breadcrumb.data, seen);
  }

  if (typeof breadcrumb.message === "string") {
    breadcrumb.message = sanitizeString(breadcrumb.message);
  }

  return breadcrumb;
}

/**
 * Determine if Sentry should be enabled.
 *
 * Respects explicit disable flags and auto-disables in test environment.
 *
 * @param dsn - Sentry DSN (required for enablement)
 * @returns true if Sentry should be enabled
 */
export function shouldEnableSentry(dsn: string | undefined): boolean {
  // Must have DSN
  if (!dsn) return false;

  // Never enable in test environment
  if (process.env.NODE_ENV === "test") return false;

  // Respect explicit disable flag
  if (process.env.NEXT_PUBLIC_DISABLE_SENTRY === "true") return false;

  return true;
}

/**
 * Resolve DSN for given target runtime.
 *
 * Client prefers NEXT_PUBLIC_SENTRY_DSN (exposed to browser).
 * Server/edge prefer SENTRY_DSN (server-only).
 *
 * @param target - Runtime target
 * @returns DSN string or undefined
 */
function resolveDsn(target: SentryTarget): string | undefined {
  if (target === "client") {
    return process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  }

  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
}

/**
 * Resolve environment name for Sentry.
 *
 * Uses clean names: "production", "preview", "development"
 *
 * @returns Environment name
 */
function resolveEnvironment(): string | undefined {
  // Explicit override
  if (process.env.SENTRY_ENVIRONMENT) {
    return process.env.SENTRY_ENVIRONMENT;
  }

  return getDeploymentEnvironment();
}

/**
 * Resolve release identifier for Sentry.
 *
 * Tries: SENTRY_RELEASE > VERCEL_GIT_COMMIT_SHA > npm_package_version
 *
 * @returns Release identifier
 */
function resolveRelease(): string | undefined {
  return (
    process.env.SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.npm_package_version
  );
}

/**
 * Create Sentry initialization options for given runtime target.
 *
 * Deep module: Hides all PII scrubbing, environment detection, and sampling
 * complexity behind a simple interface.
 *
 * @param target - Runtime target (client, server, or edge)
 * @returns Sentry init options
 *
 * @example
 * ```typescript
 * import * as Sentry from "@sentry/nextjs";
 * import { createSentryOptions } from "./lib/sentry";
 *
 * const options = createSentryOptions("client");
 * Sentry.init(options);
 * ```
 */
export function createSentryOptions(target: SentryTarget): BrowserOptions {
  const dsn = resolveDsn(target);
  const enabled = shouldEnableSentry(dsn);
  const tracesSampleRate = parseSampleRate(
    process.env.SENTRY_TRACES_SAMPLE_RATE,
    DEFAULT_TRACES_SAMPLE_RATE
  );

  const options: BrowserOptions = {
    dsn,
    enabled,
    environment: resolveEnvironment(),
    release: resolveRelease(),
    tracesSampleRate,
    sendDefaultPii: false,
    beforeSend: sanitizeEvent as BrowserOptions["beforeSend"],
    beforeBreadcrumb: sanitizeBreadcrumb,
  };

  // Client-specific: Session Replay configuration
  if (target === "client") {
    options.replaysSessionSampleRate = parseSampleRate(
      process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
      DEFAULT_REPLAYS_SESSION_SAMPLE_RATE
    );
    options.replaysOnErrorSampleRate = parseSampleRate(
      process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
      DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE
    );
  }

  // Disable sampling if Sentry is disabled
  if (!enabled) {
    options.tracesSampleRate = 0;
    options.replaysSessionSampleRate = 0;
    options.replaysOnErrorSampleRate = 0;
  }

  return options;
}

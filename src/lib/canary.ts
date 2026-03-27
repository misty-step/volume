import { sanitizeEmail } from "./sanitize";

const DEFAULT_ENDPOINT = "https://canary-obs.fly.dev";
const REQUEST_TIMEOUT_MS = 2_000;
const SERVICE = "volume";

export type CanarySeverity = "error" | "warning" | "info";

export function isCanaryEnabled(): boolean {
  return getApiKey().length > 0;
}

export async function captureCanaryException(
  error: unknown,
  options: {
    severity?: CanarySeverity;
    context?: Record<string, unknown>;
    fingerprint?: string[];
  } = {}
): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const normalized = normalizeError(error);

  await sendPayload(apiKey, {
    error_class: normalized.errorClass,
    message: sanitizeString(normalized.message),
    severity: options.severity ?? "error",
    stack_trace: normalized.stackTrace
      ? sanitizeString(normalized.stackTrace)
      : undefined,
    context: sanitizeContext(options.context),
    fingerprint: options.fingerprint,
  });
}

function getEndpoint(): string {
  return process.env.NEXT_PUBLIC_CANARY_ENDPOINT?.trim() || DEFAULT_ENDPOINT;
}

function getApiKey(): string {
  return process.env.NEXT_PUBLIC_CANARY_API_KEY?.trim() || "";
}

function normalizeError(error: unknown): {
  errorClass: string;
  message: string;
  stackTrace?: string;
} {
  if (error instanceof Error) {
    return {
      errorClass: error.name || error.constructor.name || "Error",
      message: error.message || "Unknown error",
      stackTrace: error.stack,
    };
  }

  if (typeof error === "string") {
    return {
      errorClass: "StringError",
      message: error,
    };
  }

  return {
    errorClass: "UnknownError",
    message: String(error),
  };
}

function sanitizeString(value: string): string {
  return sanitizeEmail(value);
}

function sanitizeContext(
  context: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!context) return undefined;
  return sanitizeValue(context, new WeakSet<object>()) as Record<
    string,
    unknown
  >;
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = sanitizeValue(entry, seen);
  }
  return result;
}

async function sendPayload(
  apiKey: string,
  payload: {
    error_class: string;
    message: string;
    severity: CanarySeverity;
    stack_trace?: string;
    context?: Record<string, unknown>;
    fingerprint?: string[];
  }
): Promise<void> {
  try {
    const res = await fetch(
      `${getEndpoint().replace(/\/$/, "")}/api/v1/errors`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service: SERVICE,
          environment: process.env.NODE_ENV ?? "production",
          ...payload,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );

    if (!res.ok && process.env.NODE_ENV === "development") {
      console.warn("Canary capture failed:", res.status);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Canary capture failed:", error);
    }
  }
}

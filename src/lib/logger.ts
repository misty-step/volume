import { getDeploymentEnvironment } from "./environment";
import { sanitizeEmail } from "./sanitize";

/**
 * Structured logger with PII redaction and environment-aware formatting.
 *
 * Deep module: Exposes a tiny interface while hiding sanitization,
 * formatting, level filtering, and test suppression logic.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;
type LogMethod = (message: string, context?: LogContext) => void;

export type Logger = {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
};

const CIRCULAR_PLACEHOLDER = "[CIRCULAR]";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: "\u001b[90m",
  info: "\u001b[36m",
  warn: "\u001b[33m",
  error: "\u001b[31m",
};

const COLOR_RESET = "\u001b[0m";

function sanitizeString(value: string): string {
  return sanitizeEmail(value);
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  // BigInt cannot be JSON.stringify'd - convert to string
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      stack: value.stack ? sanitizeString(value.stack) : undefined,
    };
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? value.toString() : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return CIRCULAR_PLACEHOLDER;
    seen.add(value);

    const record = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      output[key] = sanitizeValue(entry, seen);
    }
    return output;
  }

  return value;
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context || Object.keys(context).length === 0) return undefined;
  return sanitizeValue(context, new WeakSet()) as LogContext;
}

function resolveLogLevel(): LogLevel {
  const raw =
    process.env.LOG_LEVEL?.toLowerCase() ||
    process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase() ||
    "";
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }

  return getDeploymentEnvironment() === "development" ? "debug" : "info";
}

function shouldLog(): boolean {
  if (process.env.NODE_ENV !== "test") return true;
  return process.env.LOG_IN_TESTS === "true";
}

function shouldOutputJson(): boolean {
  return getDeploymentEnvironment() !== "development";
}

// Memoize at module load (env vars are constant)
const MIN_LOG_LEVEL = resolveLogLevel();
const IS_LOGGING_ENABLED = shouldLog();
const USE_JSON_OUTPUT = shouldOutputJson();

function formatDevLine(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const coloredLevel = `${LEVEL_COLOR[level]}${level.toUpperCase()}${COLOR_RESET}`;
  const header = `${timestamp} ${coloredLevel} ${message}`;

  if (!context) return header;

  return `${header}\n${JSON.stringify(context, null, 2)}`;
}

function emitLog(
  level: LogLevel,
  message: string,
  context: LogContext | undefined,
  minLevel: LogLevel
): void {
  if (!IS_LOGGING_ENABLED) return;
  if (LEVEL_RANK[level] < LEVEL_RANK[minLevel]) return;

  const sanitizedMessage = sanitizeString(message);
  const sanitizedContext = sanitizeContext(context);

  const output = USE_JSON_OUTPUT
    ? JSON.stringify({
        ...(sanitizedContext ?? {}),
        level,
        message: sanitizedMessage,
        time: new Date().toISOString(),
      })
    : formatDevLine(level, sanitizedMessage, sanitizedContext);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.warn(output);
  }
}

function createLogger(baseContext?: LogContext): Logger {
  return {
    debug: (message, context) =>
      emitLog("debug", message, { ...baseContext, ...context }, MIN_LOG_LEVEL),
    info: (message, context) =>
      emitLog("info", message, { ...baseContext, ...context }, MIN_LOG_LEVEL),
    warn: (message, context) =>
      emitLog("warn", message, { ...baseContext, ...context }, MIN_LOG_LEVEL),
    error: (message, context) =>
      emitLog("error", message, { ...baseContext, ...context }, MIN_LOG_LEVEL),
  };
}

export const log = createLogger();

export function createChildLogger(context: LogContext): Logger {
  return createLogger(context);
}

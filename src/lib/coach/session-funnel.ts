import { trackEvent } from "@/lib/analytics";
import { log } from "@/lib/logger";
import type { CoachTraceData } from "@/lib/coach/ui-message";

export type KickoffSource = "page_load" | "deeplink";

const COACH_SESSION_STORAGE_PREFIX = "volume:coach-session";
const COACH_SESSION_STORAGE_KEY_PREFIX = `${COACH_SESSION_STORAGE_PREFIX}:`;
const COACH_SESSION_STORAGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function logStorageWarning(
  operation: "read" | "write" | "prune",
  error: unknown
): void {
  log.warn("Coach session storage unavailable", {
    component: "session-funnel",
    operation,
    error: error instanceof Error ? error.message : String(error),
  });
}

function getCoachSessionStorageKey(sessionId: string, suffix: string): string {
  return `${COACH_SESSION_STORAGE_PREFIX}:${sessionId}:${suffix}`;
}

function readSessionStorageValue(
  sessionId: string,
  suffix: string
): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(
      getCoachSessionStorageKey(sessionId, suffix)
    );
  } catch (error) {
    logStorageWarning("read", error);
    return null;
  }
}

function writeSessionStorageValue(
  sessionId: string,
  suffix: string,
  value: string
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getCoachSessionStorageKey(sessionId, suffix),
      value
    );
  } catch (error) {
    logStorageWarning("write", error);
  }
}

function pruneSessionTracking(now: number = Date.now()): void {
  if (typeof window === "undefined") return;

  const cutoff = now - COACH_SESSION_STORAGE_RETENTION_MS;

  try {
    const keysToRemove: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(COACH_SESSION_STORAGE_KEY_PREFIX)) continue;

      const storedValue = window.localStorage.getItem(key);
      const timestamp = Number(storedValue);
      if (!Number.isFinite(timestamp) || timestamp < cutoff) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    logStorageWarning("prune", error);
  }
}

function hasTrackedSessionEvent(sessionId: string, eventName: string): boolean {
  return readSessionStorageValue(sessionId, eventName) !== null;
}

function markSessionEventTracked(sessionId: string, eventName: string): void {
  writeSessionStorageValue(sessionId, eventName, String(Date.now()));
}

function getKickoffTimestamp(sessionId: string): number | null {
  const value = readSessionStorageValue(sessionId, "kickoff_at");
  if (!value) return null;

  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function ensureKickoffTimestamp(sessionId: string): number {
  const existing = getKickoffTimestamp(sessionId);
  if (existing !== null) return existing;

  const now = Date.now();
  writeSessionStorageValue(sessionId, "kickoff_at", String(now));
  return now;
}

export function trackCoachKickoff(
  sessionId: string,
  source: KickoffSource
): void {
  pruneSessionTracking();
  ensureKickoffTimestamp(sessionId);
  if (hasTrackedSessionEvent(sessionId, "kickoff_reached")) return;

  trackEvent("Kickoff Reached", {
    session_id: sessionId,
    source,
  });
  markSessionEventTracked(sessionId, "kickoff_reached");
}

export function trackCoachFirstTurn(trace: CoachTraceData): void {
  if (!trace.session_id) return;

  pruneSessionTracking();

  if (!hasTrackedSessionEvent(trace.session_id, "first_message")) {
    trackEvent("First Message", {
      session_id: trace.session_id,
      turn_index: trace.turn_index,
      tool_calls_count: trace.tool_calls_count,
    });
    markSessionEventTracked(trace.session_id, "first_message");
  }

  if (
    trace.first_logged_exercise &&
    !hasTrackedSessionEvent(trace.session_id, "first_log")
  ) {
    const kickoffAt = ensureKickoffTimestamp(trace.session_id);
    trackEvent("First Log", {
      session_id: trace.session_id,
      exercise: trace.first_logged_exercise,
      time_to_first_log_ms: Math.max(0, Date.now() - kickoffAt),
    });
    markSessionEventTracked(trace.session_id, "first_log");
  }
}

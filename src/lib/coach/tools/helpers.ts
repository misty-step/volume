import { formatDuration } from "@/lib/date-utils";
import type { Set } from "@/types/domain";
import type { SetInput, ToolResult } from "./types";

export function normalizeLookup(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function toAnalyticsSetInput(set: SetInput) {
  return {
    exerciseId: String(set.exerciseId),
    performedAt: set.performedAt,
    reps: set.reps,
    duration: set.duration,
    weight: set.weight,
    unit: set.unit,
  };
}

export function uniquePrompts(prompts: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const prompt of prompts) {
    const normalized = prompt.toLowerCase().trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(prompt);
    if (output.length >= 4) break;
  }

  return output;
}

export function formatSecondsShort(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return formatDuration(seconds);
}

type LocalDateParts = { year: number; month: number; day: number };

function parseLocalDateParts(dateStr: string): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function dateStringToDayRangeMs(
  dateStr: string,
  offsetMinutes: number
): { start: number; end: number } | null {
  const parsed = parseLocalDateParts(dateStr);
  if (!parsed) return null;
  const { year, month, day } = parsed;
  const offsetMs = offsetMinutes * 60_000;
  return {
    start: Date.UTC(year, month - 1, day, 0, 0, 0, 0) + offsetMs,
    end: Date.UTC(year, month - 1, day, 23, 59, 59, 999) + offsetMs,
  };
}

export function describeSetSummary(
  set: Set,
  defaultUnit: "lbs" | "kg"
): string {
  if (set.duration !== undefined) return formatSecondsShort(set.duration);
  const reps = set.reps ?? 0;
  if (set.weight === undefined) return `${reps} reps`;
  return `${reps} reps @ ${set.weight} ${set.unit ?? defaultUnit}`;
}

export function exerciseNotFoundResult(
  name: string,
  errorCode = "exercise_not_found",
  description = "I couldn't find that exercise in your library."
): ToolResult {
  return {
    summary: `Could not find "${name}".`,
    blocks: [
      {
        type: "status",
        tone: "error",
        title: "Exercise not found",
        description,
      },
    ],
    outputForModel: { status: "error", error: errorCode },
  };
}

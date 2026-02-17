import { formatDuration } from "@/lib/date-utils";
import type { SetInput } from "./types";

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

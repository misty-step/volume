import type { Set, Exercise } from "@/types/domain";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * CSV Export for workout data.
 *
 * Deep module: single `exportWorkoutData` function hides all complexity:
 * - RFC 4180 escaping (commas, quotes, newlines)
 * - Date/time formatting
 * - Chronological sorting
 * - Exercise lookup (Map built internally)
 * - Blob URL lifecycle + browser download trigger
 *
 * Interface: exportWorkoutData(sets, exercises, options?)
 * Hidden: escaping, formatting, sorting, Map construction, download trigger
 */

/**
 * Export workout data as CSV file download.
 *
 * Builds internal lookup structures; callers need only provide raw arrays.
 *
 * @param sets - Array of set records from Convex
 * @param exercises - Array of exercise records (Map built internally for O(1) lookup)
 * @param options - Optional filename override
 */
export function exportWorkoutData(
  sets: Set[],
  exercises: Exercise[],
  options?: { filename?: string }
): void {
  // Build exercise lookup internally - callers don't need to know the strategy
  const exerciseMap = buildExerciseMap(exercises);
  const csv = generateWorkoutCSV(sets, exerciseMap);
  const filename = options?.filename ?? generateDefaultFilename();
  triggerBrowserDownload(csv, filename);
}

/**
 * Generate CSV string from workout data.
 *
 * Exported for testing. In production, use exportWorkoutData() which
 * handles the full pipeline including download trigger.
 */
export function generateCSV(sets: Set[], exercises: Exercise[]): string {
  const exerciseMap = buildExerciseMap(exercises);
  return generateWorkoutCSV(sets, exerciseMap);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal implementation - not exported
// ─────────────────────────────────────────────────────────────────────────────

/** Build exercise ID -> Exercise Map for O(1) lookups. */
function buildExerciseMap(exercises: Exercise[]): Map<Id<"exercises">, Exercise> {
  return new Map(exercises.map((ex) => [ex._id, ex]));
}

/** Generate default export filename with current date. */
function generateDefaultFilename(): string {
  const dateStr = new Date().toISOString().split("T")[0];
  return "volume-export-" + dateStr + ".csv";
}

/**
 * Escape a field value for CSV per RFC 4180.
 * Wraps in quotes if contains comma, quote, or newline; doubles internal quotes.
 */
function escapeCSVField(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";

  const str = String(value);
  const needsEscape = str.includes(",") || str.includes('"') || str.includes("\n");

  if (!needsEscape) return str;
  return '"' + str.replace(/"/g, '""') + '"';
}

/** Format timestamp as ISO-8601 date (YYYY-MM-DD). */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0] ?? "";
}

/** Format timestamp as 24h time (HH:MM). */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toTimeString().slice(0, 5);
}

/** Generate CSV content from workout sets and exercises. */
function generateWorkoutCSV(
  sets: Set[],
  exerciseMap: Map<Id<"exercises">, Exercise>
): string {
  const headers = [
    "date",
    "time",
    "exercise",
    "muscle_groups",
    "reps",
    "weight",
    "unit",
    "duration_seconds",
  ];

  // Sort sets by performedAt ascending (oldest first for chronological export)
  const sortedSets = [...sets].sort((a, b) => a.performedAt - b.performedAt);

  const rows = sortedSets.map((set) => {
    const exercise = exerciseMap.get(set.exerciseId);
    const exerciseName = exercise?.name ?? "Unknown Exercise";
    const muscleGroups = exercise?.muscleGroups?.join(",") ?? "";

    return [
      formatDate(set.performedAt),
      formatTime(set.performedAt),
      escapeCSVField(exerciseName),
      escapeCSVField(muscleGroups),
      escapeCSVField(set.reps),
      escapeCSVField(set.weight),
      escapeCSVField(set.unit),
      escapeCSVField(set.duration),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/** Trigger browser download of CSV content. */
function triggerBrowserDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

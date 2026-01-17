import type { Id } from "../../convex/_generated/dataModel";

/**
 * CSV Export for workout data.
 *
 * Deep module: single `exportWorkoutData` function hides all complexity:
 * - RFC 4180 escaping (commas, quotes, newlines)
 * - Date/time formatting
 * - Chronological sorting
 * - Blob URL lifecycle + browser download trigger
 */

interface SetData {
  _id: Id<"sets">;
  exerciseId: Id<"exercises">;
  performedAt: number;
  reps?: number;
  weight?: number;
  unit?: string;
  duration?: number;
}

interface ExerciseData {
  _id: Id<"exercises">;
  name: string;
  muscleGroups?: string[];
}

/**
 * Export workout data as CSV file download.
 *
 * @param sets - Array of set records
 * @param exerciseMap - Map of exercise ID to exercise data for O(1) lookups
 * @param options - Optional filename override
 */
export function exportWorkoutData(
  sets: SetData[],
  exerciseMap: Map<Id<"exercises">, ExerciseData>,
  options?: { filename?: string }
): void {
  const csv = generateWorkoutCSV(sets, exerciseMap);
  const filename = options?.filename ?? getDefaultFilename();
  triggerDownload(csv, filename);
}

/** Generate default export filename with current date. */
function getDefaultFilename(): string {
  return `volume-export-${new Date().toISOString().split("T")[0]}.csv`;
}

/**
 * Escape a field value for CSV per RFC 4180.
 * Wraps in quotes if contains comma, quote, or newline; doubles internal quotes.
 */
function escapeCSVField(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";

  const str = String(value);
  const needsEscape = str.includes(",") || str.includes('"') || str.includes("\n");

  return needsEscape ? `"${str.replace(/"/g, '""')}"` : str;
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
  sets: SetData[],
  exerciseMap: Map<Id<"exercises">, ExerciseData>
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
function triggerDownload(content: string, filename: string): void {
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

// Export internal functions for testing only
export { escapeCSVField, generateWorkoutCSV, getDefaultFilename };

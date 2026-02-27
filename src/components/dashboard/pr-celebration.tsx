/**
 * PR Celebration Toast
 *
 * Shows a celebratory toast when a user achieves a new personal record.
 * Uses Sonner toast library for consistent toast styling.
 */

import { toast } from "sonner";
import { type PRResult } from "@/lib/pr-detection";

/**
 * Show PR celebration toast
 *
 * Displays a toast notification when user achieves a new personal record.
 * Toast auto-dismisses after 5 seconds.
 *
 * @param exerciseName - Name of the exercise
 * @param prResult - The PR result containing type and values
 * @param unit - Weight unit (lbs or kg)
 *
 * @example
 * ```typescript
 * showPRCelebration("Squats", {
 *   type: 'weight',
 *   currentValue: 315,
 *   previousValue: 300
 * }, "lbs");
 * ```
 */
export function showPRCelebration(
  exerciseName: string,
  prResult: PRResult,
  unit: string = "lbs"
): void {
  const { type, currentValue, previousValue } = prResult;

  let message: string;
  let description: string;

  switch (type) {
    case "weight":
      message = `🎉 NEW PR! ${exerciseName}`;
      description = `${currentValue} ${unit} (previous: ${previousValue} ${unit})`;
      break;

    case "volume":
      message = `🎉 NEW PR! ${exerciseName}`;
      description = `${currentValue} ${unit} total volume (previous: ${previousValue} ${unit})`;
      break;

    case "reps":
      message = `🎉 NEW PR! ${exerciseName}`;
      description = `${currentValue} reps (previous: ${previousValue} reps)`;
      break;
  }

  toast.success(message, {
    description,
    duration: 5000, // 5 seconds
    icon: "🏆",
  });
}

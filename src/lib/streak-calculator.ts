/**
 * Streak Calculation
 *
 * Calculates consecutive workout days for motivation and gamification.
 * Handles timezone-aware day boundaries using date-fns.
 */

import { startOfDay, differenceInCalendarDays } from "date-fns";
import { Set } from "@/types/domain";

/**
 * Calculate current workout streak (consecutive days with sets logged)
 *
 * A streak is broken if there's a gap of more than 1 day between workouts.
 * Uses timezone-aware day boundaries (midnight to midnight in local time).
 *
 * Algorithm:
 * 1. Group sets by calendar day (timezone-aware)
 * 2. Sort days descending (newest first)
 * 3. Count consecutive days starting from today or yesterday
 * 4. Break on first gap > 1 day
 *
 * @param sets - All sets for the user (any order)
 * @returns Number of consecutive days with workouts (0 if no recent workout)
 *
 * @example
 * ```typescript
 * // User worked out Mon, Tue, Wed, Fri (today)
 * const sets = [...]; // Sets from those days
 * const streak = calculateStreak(sets);
 * // Returns: 1 (only Friday counts - gap on Thursday broke streak)
 * ```
 *
 * @example
 * ```typescript
 * // User worked out Mon, Tue, Wed, Thu, Fri (today)
 * const sets = [...]; // Sets from those days
 * const streak = calculateStreak(sets);
 * // Returns: 5 (all consecutive days)
 * ```
 */
export function calculateStreak(sets: Set[]): number {
  if (sets.length === 0) return 0;

  // Group sets by calendar day (timezone-aware)
  const uniqueDays = new globalThis.Set<string>();

  for (const set of sets) {
    const [dayKey] = startOfDay(new Date(set.performedAt))
      .toISOString()
      .split("T"); // YYYY-MM-DD
    if (dayKey) uniqueDays.add(dayKey);
  }

  // Convert to sorted array (newest first)
  const sortedDays = Array.from(uniqueDays).sort().reverse();

  if (sortedDays.length === 0) return 0;

  const today = startOfDay(new Date());
  const todayKey = today.toISOString().split("T")[0];
  const mostRecentDay = new Date(sortedDays[0] + "T00:00:00");

  // Check if most recent workout was today or yesterday
  const daysSinceLastWorkout = differenceInCalendarDays(today, mostRecentDay);

  // Streak is broken if last workout was more than 1 day ago
  if (daysSinceLastWorkout > 1) {
    return 0;
  }

  // Count consecutive days backwards from most recent
  let streak = 1; // Start with the most recent day
  let currentDate = mostRecentDay;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDay = new Date(sortedDays[i] + "T00:00:00");
    const gap = differenceInCalendarDays(currentDate, prevDay);

    if (gap === 1) {
      // Consecutive day - increment streak
      streak++;
      currentDate = prevDay;
    } else {
      // Gap found - stop counting
      break;
    }
  }

  return streak;
}

/**
 * Get streak milestone tier for celebration
 *
 * @param streak - Current streak count
 * @returns Milestone tier or null if no milestone
 */
export function getStreakMilestone(
  streak: number
): "week" | "month" | "hundred" | null {
  if (streak >= 100) return "hundred";
  if (streak >= 30) return "month";
  if (streak >= 7) return "week";
  return null;
}

/**
 * Format streak for display
 *
 * @param streak - Current streak count
 * @returns Formatted string with fire emoji
 *
 * @example
 * formatStreak(7) // => "🔥 7 Day Streak"
 * formatStreak(1) // => "🔥 1 Day Streak"
 */
export function formatStreak(streak: number): string {
  const days = streak === 1 ? "Day" : "Days";
  return `🔥 ${streak} ${days} Streak`;
}

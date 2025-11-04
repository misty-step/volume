/**
 * Streak Calculation for Convex
 *
 * Calculates workout streaks based on consecutive days with logged sets.
 * Adapted from client-side streak calculator for server-side use.
 */

import { startOfDay, differenceInCalendarDays } from "date-fns";

interface SetData {
  performedAt: number;
}

/**
 * Calculate current workout streak (consecutive days with sets logged)
 *
 * A streak is broken if there's a gap of more than 1 day between workouts.
 *
 * LIMITATION: Uses UTC day boundaries (midnight to midnight UTC).
 * Users in non-UTC timezones may see off-by-one day errors when logging
 * workouts near midnight local time. For accurate streaks, consider storing
 * localDayKey on the client side.
 *
 * @param sets - All sets for the user (any order)
 * @returns Number of consecutive days with workouts (0 if no recent workout)
 */
export function calculateCurrentStreak(sets: SetData[]): number {
  if (sets.length === 0) return 0;

  // Group sets by calendar day (timezone-aware)
  const uniqueDays = new globalThis.Set<string>();

  for (const set of sets) {
    const dayKey = startOfDay(new Date(set.performedAt))
      .toISOString()
      .split("T")[0]; // YYYY-MM-DD
    uniqueDays.add(dayKey);
  }

  // Convert to sorted array (newest first)
  const sortedDays = Array.from(uniqueDays).sort().reverse();

  if (sortedDays.length === 0) return 0;

  const today = startOfDay(new Date());
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
 * Calculate longest streak from workout history
 *
 * Scans entire workout history to find the longest consecutive streak.
 *
 * @param sets - All sets for the user
 * @returns Longest streak in days
 */
export function calculateLongestStreak(sets: SetData[]): number {
  if (sets.length === 0) return 0;

  // Group sets by calendar day
  const uniqueDays = new globalThis.Set<string>();

  for (const set of sets) {
    const dayKey = startOfDay(new Date(set.performedAt))
      .toISOString()
      .split("T")[0];
    uniqueDays.add(dayKey);
  }

  // Convert to sorted array (oldest first for forward scanning)
  const sortedDays = Array.from(uniqueDays).sort();

  if (sortedDays.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDay = new Date(sortedDays[i - 1] + "T00:00:00");
    const currentDay = new Date(sortedDays[i] + "T00:00:00");
    const gap = differenceInCalendarDays(currentDay, prevDay);

    if (gap === 1) {
      // Consecutive day - increment current streak
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      // Gap found - reset current streak
      currentStreak = 1;
    }
  }

  return longestStreak;
}

/**
 * Calculate total unique workout days
 *
 * @param sets - All sets for the user
 * @returns Number of unique days with workouts
 */
export function calculateTotalWorkouts(sets: SetData[]): number {
  if (sets.length === 0) return 0;

  const uniqueDays = new globalThis.Set<string>();

  for (const set of sets) {
    const dayKey = startOfDay(new Date(set.performedAt))
      .toISOString()
      .split("T")[0];
    uniqueDays.add(dayKey);
  }

  return uniqueDays.size;
}

/**
 * Streak Calculation
 *
 * Shared, timezone-aware streak utilities.
 */

import { differenceInCalendarDays, startOfDay } from "date-fns";

type SetLike = { performedAt: number };

const getUniqueDayKeys = (sets: SetLike[]): string[] => {
  const uniqueDays = new globalThis.Set<string>();

  for (const set of sets) {
    const [dayKey] = startOfDay(new Date(set.performedAt))
      .toISOString()
      .split("T");
    if (dayKey) uniqueDays.add(dayKey);
  }

  return Array.from(uniqueDays);
};

export function calculateCurrentStreak(sets: SetLike[]): number {
  if (sets.length === 0) return 0;

  const sortedDays = getUniqueDayKeys(sets).sort().reverse();

  if (sortedDays.length === 0) return 0;

  const today = startOfDay(new Date());
  const mostRecentDay = new Date(sortedDays[0] + "T00:00:00");
  const daysSinceLastWorkout = differenceInCalendarDays(today, mostRecentDay);

  if (daysSinceLastWorkout > 1) {
    return 0;
  }

  let streak = 1;
  let currentDate = mostRecentDay;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDay = new Date(sortedDays[i] + "T00:00:00");
    const gap = differenceInCalendarDays(currentDate, prevDay);

    if (gap === 1) {
      streak++;
      currentDate = prevDay;
    } else {
      break;
    }
  }

  return streak;
}

export function calculateLongestStreak(sets: SetLike[]): number {
  if (sets.length === 0) return 0;

  const sortedDays = getUniqueDayKeys(sets).sort();

  if (sortedDays.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevKey = sortedDays[i - 1];
    const currentKey = sortedDays[i];
    if (!prevKey || !currentKey) continue;

    const prevDay = new Date(prevKey + "T00:00:00");
    const currentDay = new Date(currentKey + "T00:00:00");
    const gap = differenceInCalendarDays(currentDay, prevDay);

    if (gap === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

export function calculateTotalWorkouts(sets: SetLike[]): number {
  if (sets.length === 0) return 0;

  return getUniqueDayKeys(sets).length;
}

export function getStreakMilestone(
  streak: number
): "week" | "month" | "hundred" | null {
  if (streak >= 100) return "hundred";
  if (streak >= 30) return "month";
  if (streak >= 7) return "week";
  return null;
}

export function formatStreak(streak: number): string {
  const days = streak === 1 ? "Day" : "Days";
  return `🔥 ${streak} ${days} Streak`;
}

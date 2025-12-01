/**
 * Date and streak calculation utilities for AI reports
 *
 * Pure functions for date range calculations and workout streak tracking.
 * Extracted for testability - no Convex dependencies.
 */

import type { Doc } from "../_generated/dataModel";

type SetDoc = Doc<"sets">;

/**
 * Calculate Monday 00:00 UTC for a given date
 *
 * @param date - Date to get week start for (defaults to now)
 * @returns Unix timestamp (ms) for Monday 00:00 UTC of that week
 */
export function getWeekStartDate(date: Date = new Date()): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = d.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1, Sunday = 0
  d.setUTCDate(d.getUTCDate() + diff);
  return d.getTime();
}

/**
 * Calculate date range based on report type
 *
 * @param reportType - Type of report (daily/weekly/monthly)
 * @param customStart - Optional custom start timestamp (for weekly reports)
 * @returns Object with startDate and endDate timestamps
 */
export function calculateDateRange(
  reportType: "daily" | "weekly" | "monthly",
  customStart?: number
): { startDate: number; endDate: number } {
  const now = new Date();
  let startDate: number;
  let endDate = now.getTime();

  switch (reportType) {
    case "daily":
      // If custom start provided, use it (for backfilling specific days)
      // Otherwise use last 24 hours from now
      if (customStart) {
        startDate = customStart;
        endDate = customStart + 24 * 60 * 60 * 1000; // 24 hours after start
      } else {
        startDate = endDate - 24 * 60 * 60 * 1000;
      }
      break;
    case "weekly":
      // Last 7 days (or custom start for Monday-based weeks)
      if (customStart) {
        startDate = customStart;
      } else {
        startDate = endDate - 7 * 24 * 60 * 60 * 1000;
      }
      break;
    case "monthly":
      // Last calendar month (1st to last day of previous month)
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);
      startDate = lastMonth.getTime();

      // End date is last day of that month
      const lastDayOfMonth = new Date(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1,
        0
      );
      lastDayOfMonth.setHours(23, 59, 59, 999);
      return { startDate, endDate: lastDayOfMonth.getTime() };
  }

  return { startDate, endDate };
}

/**
 * Calculate current workout streak
 *
 * @param sets - All user sets sorted by performedAt
 * @returns Number of consecutive days with workouts (including today if active)
 */
export function calculateCurrentStreak(
  sets: Array<Pick<SetDoc, "performedAt">>
): number {
  if (sets.length === 0) return 0;

  const workoutDays = Array.from(
    new Set(
      sets.map((s) => new Date(s.performedAt).toISOString().split("T")[0])
    )
  ).sort();

  const lastWorkout = workoutDays.at(-1);
  if (!lastWorkout) return 0;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Check if streak is active (today or yesterday)
  if (lastWorkout !== today && lastWorkout !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = workoutDays.length - 2; i >= 0; i--) {
    const currentDay = workoutDays[i];
    const nextDay = workoutDays[i + 1];
    if (!currentDay || !nextDay) break;

    const current = new Date(currentDay);
    const next = new Date(nextDay);
    const diffDays = Math.floor(
      (next.getTime() - current.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate longest streak in history
 *
 * @param sets - All user sets
 * @returns Maximum consecutive days with workouts ever achieved
 */
export function calculateLongestStreak(
  sets: Array<Pick<SetDoc, "performedAt">>
): number {
  if (sets.length === 0) return 0;

  const workoutDays = Array.from(
    new Set(
      sets.map((s) => new Date(s.performedAt).toISOString().split("T")[0])
    )
  ).sort();

  if (workoutDays.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < workoutDays.length; i++) {
    const prevDay = workoutDays[i - 1];
    const currDay = workoutDays[i];
    if (!prevDay || !currDay) break;

    const prev = new Date(prevDay);
    const curr = new Date(currDay);
    const diffDays = Math.floor(
      (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

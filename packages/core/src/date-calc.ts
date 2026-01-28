/**
 * Date Calculations
 */
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
 * Get default period start for a report type
 *
 * @param reportType - Type of report (daily/weekly/monthly)
 * @returns Unix timestamp for the default period start
 */
export function getDefaultPeriodStart(
  reportType: "daily" | "weekly" | "monthly"
): number {
  const now = new Date();

  switch (reportType) {
    case "daily": {
      // Start of today (UTC)
      const today = new Date(now);
      today.setUTCHours(0, 0, 0, 0);
      return today.getTime();
    }
    case "monthly": {
      // Start of current month (UTC)
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      return monthStart.getTime();
    }
    case "weekly":
    default:
      return getWeekStartDate();
  }
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
    case "monthly": {
      // Last calendar month (1st to last day of previous month)
      const lastMonth = new Date(now);
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      lastMonth.setUTCDate(1);
      lastMonth.setUTCHours(0, 0, 0, 0);
      startDate = lastMonth.getTime();

      // End date is last day of that month
      const lastDayOfMonth = new Date(
        Date.UTC(
          lastMonth.getUTCFullYear(),
          lastMonth.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999
        )
      );
      return { startDate, endDate: lastDayOfMonth.getTime() };
    }
  }

  return { startDate, endDate };
}

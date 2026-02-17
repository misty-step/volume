import { startOfDay, endOfDay } from "date-fns";

/**
 * Get the start and end timestamps for today in the user's local timezone.
 *
 * "Today" is defined as midnight-to-midnight in the user's current timezone,
 * determined by the browser's Intl.DateTimeFormat API. This handles:
 * - Users in different timezones
 * - DST transitions (date-fns handles automatically)
 * - Users traveling across timezones (uses current device timezone)
 *
 * @returns Object with start (midnight) and end (23:59:59.999) timestamps in milliseconds
 *
 * @example
 * const { start, end } = getTodayRange();
 * const todaysSets = sets.filter(s => s.performedAt >= start && s.performedAt <= end);
 */
export function getTodayRange(): { start: number; end: number } {
  const now = new Date();

  return {
    start: startOfDay(now).getTime(),
    end: endOfDay(now).getTime(),
  };
}

/**
 * Get "today" start/end boundaries for a given timezone offset (in minutes).
 *
 * Returns UTC timestamps (ms) that correspond to midnight-to-midnight in the
 * user's timezone, using the JS `Date#getTimezoneOffset()` convention:
 * - positive values are timezones behind UTC (e.g. America/Chicago ~ 360)
 * - negative values are timezones ahead of UTC (e.g. Asia/Kolkata = -330)
 *
 * Notes:
 * - Offset-based math is an approximation around DST boundaries (offset can
 *   change within the same local day). For the coach prototype, this is
 *   acceptable; for full accuracy, pass an IANA timezone name instead.
 */
export function getTodayRangeForTimezoneOffset(
  timezoneOffsetMinutes: number,
  nowMs: number = Date.now()
): { start: number; end: number } {
  const offsetMs = timezoneOffsetMinutes * 60 * 1000;

  // Treat "local wall time" as UTC by shifting the instant, then use UTC
  // accessors to compute the local calendar date.
  const localAsUtc = nowMs - offsetMs;
  const localDate = new Date(localAsUtc);

  const year = localDate.getUTCFullYear();
  const month = localDate.getUTCMonth();
  const day = localDate.getUTCDate();

  const startLocalAsUtc = Date.UTC(year, month, day, 0, 0, 0, 0);
  const endLocalAsUtc = Date.UTC(year, month, day, 23, 59, 59, 999);

  return {
    start: startLocalAsUtc + offsetMs,
    end: endLocalAsUtc + offsetMs,
  };
}

/**
 * Format timestamp as time only (12-hour format with am/pm)
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string (e.g., "2:30 PM")
 *
 * @example
 * formatTime(1697734800000) // => "2:30 PM"
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format timestamp as date + time (12-hour format)
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date/time string (e.g., "Oct 19, 2:30 PM")
 *
 * @example
 * formatDateTime(1697734800000) // => "Oct 19, 2:30 PM"
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format timestamp intelligently:
 * - Today's timestamps: show time only ("2:30 PM")
 * - Older timestamps: show date + time ("Oct 19, 2:30 PM")
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string appropriate for recency
 *
 * @example
 * formatTimestamp(todayTimestamp) // => "2:30 PM"
 * formatTimestamp(yesterdayTimestamp) // => "Oct 19, 2:30 PM"
 */
export function formatTimestamp(timestamp: number): string {
  const { start, end } = getTodayRange();
  const isToday = timestamp >= start && timestamp <= end;

  return isToday ? formatTime(timestamp) : formatDateTime(timestamp);
}

/**
 * Format duration in seconds to mm:ss format
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "5:30")
 *
 * @example
 * formatDuration(90) // => "1:30"
 * formatDuration(330) // => "5:30"
 * formatDuration(3665) // => "61:05"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format style for relative time display
 * - "terminal": Uppercase verbose format ("5 MIN AGO", "2 HR AGO")
 * - "compact": Uppercase terse format ("5M AGO", "3H AGO"), switches to HH:MM after 24h
 */
export type TimeFormat = "terminal" | "compact";

/**
 * Format timestamp as relative time ("X ago") with configurable style.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param format - Display format: "terminal" (default, uppercase) or "compact" (uppercase terse)
 * @returns Relative time string
 *
 * @example
 * // Terminal format (uppercase, verbose)
 * formatTimeAgo(Date.now() - 45000, "terminal") // => "45 SEC AGO"
 * formatTimeAgo(Date.now() - 300000, "terminal") // => "5 MIN AGO"
 * formatTimeAgo(Date.now() - 7200000, "terminal") // => "2 HR AGO"
 * formatTimeAgo(Date.now() - 172800000, "terminal") // => "2 DAYS AGO"
 *
 * @example
 * // Compact format (uppercase terse, switches to HH:MM after 24h)
 * formatTimeAgo(Date.now() - 30000, "compact") // => "JUST NOW"
 * formatTimeAgo(Date.now() - 300000, "compact") // => "5M AGO"
 * formatTimeAgo(Date.now() - 7200000, "compact") // => "2H AGO"
 * formatTimeAgo(Date.now() - 172800000, "compact") // => "14:30" (absolute time)
 */
export function formatTimeAgo(
  timestamp: number,
  format: TimeFormat = "terminal"
): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  // Less than 60 seconds (including future timestamps)
  if (seconds < 60) {
    if (format === "terminal") {
      // Clamp negative values to 0 for future timestamps
      return `${Math.max(0, seconds)} SEC AGO`;
    }
    return "JUST NOW";
  }

  // Less than 60 minutes
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return format === "terminal" ? `${minutes} MIN AGO` : `${minutes}M AGO`;
  }

  // Less than 24 hours
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return format === "terminal" ? `${hours} HR AGO` : `${hours}H AGO`;
  }

  // 24 hours or more
  if (format === "compact") {
    // Compact format: switch to absolute time (HH:MM in 24-hour format)
    // Use local time components to match user's timezone
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  // Terminal format: show days
  const days = Math.floor(hours / 24);
  return `${days} DAY${days === 1 ? "" : "S"} AGO`;
}

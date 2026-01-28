/**
 * Date Utilities Tests
 *
 * Tests for pure functions: getWeekStartDate, calculateDateRange,
 * calculateCurrentStreak, calculateLongestStreak.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getWeekStartDate,
  calculateDateRange,
  calculateCurrentStreak,
  calculateLongestStreak,
} from "./dateUtils";

describe("getWeekStartDate", () => {
  it("returns Monday 00:00 UTC for a Wednesday", () => {
    // Wednesday, Jan 15, 2025 at 14:30 UTC
    const wednesday = new Date("2025-01-15T14:30:00Z");
    const result = getWeekStartDate(wednesday);

    // Should be Monday, Jan 13, 2025 00:00 UTC
    const expected = new Date("2025-01-13T00:00:00Z").getTime();
    expect(result).toBe(expected);
  });

  it("returns Monday 00:00 UTC when given a Monday", () => {
    // Monday, Jan 13, 2025 at 10:00 UTC
    const monday = new Date("2025-01-13T10:00:00Z");
    const result = getWeekStartDate(monday);

    // Should be same Monday at 00:00 UTC
    const expected = new Date("2025-01-13T00:00:00Z").getTime();
    expect(result).toBe(expected);
  });

  it("returns previous Monday for a Sunday", () => {
    // Sunday, Jan 19, 2025 at 23:59 UTC
    const sunday = new Date("2025-01-19T23:59:00Z");
    const result = getWeekStartDate(sunday);

    // Should be Monday, Jan 13, 2025 00:00 UTC (previous Monday)
    const expected = new Date("2025-01-13T00:00:00Z").getTime();
    expect(result).toBe(expected);
  });

  it("handles Saturday correctly", () => {
    // Saturday, Jan 18, 2025
    const saturday = new Date("2025-01-18T12:00:00Z");
    const result = getWeekStartDate(saturday);

    // Should be Monday, Jan 13, 2025
    const expected = new Date("2025-01-13T00:00:00Z").getTime();
    expect(result).toBe(expected);
  });

  it("handles year boundaries", () => {
    // Wednesday, Jan 1, 2025 (first day of year)
    const newYear = new Date("2025-01-01T00:00:00Z");
    const result = getWeekStartDate(newYear);

    // Should be Monday, Dec 30, 2024
    const expected = new Date("2024-12-30T00:00:00Z").getTime();
    expect(result).toBe(expected);
  });

  it("defaults to current date when no argument", () => {
    const now = Date.now();
    const result = getWeekStartDate();

    // Result should be in the past (start of current week)
    expect(result).toBeLessThanOrEqual(now);
    // And should be a Monday (UTC day 1)
    const resultDate = new Date(result);
    expect(resultDate.getUTCDay()).toBe(1);
    expect(resultDate.getUTCHours()).toBe(0);
    expect(resultDate.getUTCMinutes()).toBe(0);
  });
});

describe("calculateDateRange", () => {
  describe("daily reports", () => {
    it("returns 24h window from custom start when provided", () => {
      const customStart = new Date("2025-01-15T00:00:00Z").getTime();
      const { startDate, endDate } = calculateDateRange("daily", customStart);

      expect(startDate).toBe(customStart);
      expect(endDate).toBe(customStart + 24 * 60 * 60 * 1000);
    });

    it("returns last 24h from now when no custom start", () => {
      const before = Date.now();
      const { startDate, endDate } = calculateDateRange("daily");
      const after = Date.now();

      // End should be approximately now
      expect(endDate).toBeGreaterThanOrEqual(before);
      expect(endDate).toBeLessThanOrEqual(after);

      // Start should be 24h before end
      expect(endDate - startDate).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe("weekly reports", () => {
    it("uses custom start when provided", () => {
      const customStart = new Date("2025-01-13T00:00:00Z").getTime();
      const { startDate, endDate } = calculateDateRange("weekly", customStart);

      expect(startDate).toBe(customStart);
      // End should be now
      expect(endDate).toBeGreaterThan(customStart);
    });

    it("returns last 7 days when no custom start", () => {
      const before = Date.now();
      const { startDate, endDate } = calculateDateRange("weekly");
      const after = Date.now();

      // End should be approximately now
      expect(endDate).toBeGreaterThanOrEqual(before);
      expect(endDate).toBeLessThanOrEqual(after);

      // Start should be 7 days before end
      expect(endDate - startDate).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe("monthly reports", () => {
    it("returns previous calendar month", () => {
      // Mock the current date to a known value
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-02-15T12:00:00Z"));

      const { startDate, endDate } = calculateDateRange("monthly");

      // Should be January 2025 (previous month)
      const start = new Date(startDate);
      const end = new Date(endDate);

      expect(start.getUTCMonth()).toBe(0); // January
      expect(start.getUTCDate()).toBe(1);
      expect(end.getUTCMonth()).toBe(0); // January
      expect(end.getUTCDate()).toBe(31);

      vi.useRealTimers();
    });

    it("handles year boundary (January -> December)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));

      const { startDate, endDate } = calculateDateRange("monthly");

      const start = new Date(startDate);
      const end = new Date(endDate);

      expect(start.getUTCFullYear()).toBe(2024);
      expect(start.getUTCMonth()).toBe(11); // December
      expect(end.getUTCMonth()).toBe(11); // December
      expect(end.getUTCDate()).toBe(31);

      vi.useRealTimers();
    });

    it("handles months with different lengths", () => {
      vi.useFakeTimers();
      // March has 31 days, February has 28/29
      vi.setSystemTime(new Date("2025-03-15T12:00:00Z"));

      const { startDate, endDate } = calculateDateRange("monthly");

      const end = new Date(endDate);
      expect(end.getUTCMonth()).toBe(1); // February
      expect(end.getUTCDate()).toBe(28); // 2025 is not a leap year

      vi.useRealTimers();
    });
  });
});

describe("calculateCurrentStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set "today" to Jan 15, 2025
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for empty sets", () => {
    expect(calculateCurrentStreak([])).toBe(0);
  });

  it("returns 1 for single workout today", () => {
    const sets = [{ performedAt: new Date("2025-01-15T10:00:00Z").getTime() }];
    expect(calculateCurrentStreak(sets)).toBe(1);
  });

  it("returns 1 for single workout yesterday", () => {
    const sets = [{ performedAt: new Date("2025-01-14T10:00:00Z").getTime() }];
    expect(calculateCurrentStreak(sets)).toBe(1);
  });

  it("returns 0 if last workout was before yesterday", () => {
    const sets = [{ performedAt: new Date("2025-01-13T10:00:00Z").getTime() }];
    expect(calculateCurrentStreak(sets)).toBe(0);
  });

  it("counts consecutive days", () => {
    const sets = [
      { performedAt: new Date("2025-01-15T10:00:00Z").getTime() }, // today
      { performedAt: new Date("2025-01-14T10:00:00Z").getTime() }, // yesterday
      { performedAt: new Date("2025-01-13T10:00:00Z").getTime() }, // 2 days ago
      { performedAt: new Date("2025-01-12T10:00:00Z").getTime() }, // 3 days ago
    ];
    expect(calculateCurrentStreak(sets)).toBe(4);
  });

  it("stops counting at gap", () => {
    const sets = [
      { performedAt: new Date("2025-01-15T10:00:00Z").getTime() }, // today
      { performedAt: new Date("2025-01-14T10:00:00Z").getTime() }, // yesterday
      // Gap on Jan 13
      { performedAt: new Date("2025-01-12T10:00:00Z").getTime() }, // 3 days ago
      { performedAt: new Date("2025-01-11T10:00:00Z").getTime() }, // 4 days ago
    ];
    expect(calculateCurrentStreak(sets)).toBe(2);
  });

  it("handles multiple sets on same day", () => {
    const sets = [
      { performedAt: new Date("2025-01-15T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-15T14:00:00Z").getTime() },
      { performedAt: new Date("2025-01-14T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-14T11:00:00Z").getTime() },
    ];
    expect(calculateCurrentStreak(sets)).toBe(2);
  });

  it("handles unsorted sets", () => {
    const sets = [
      { performedAt: new Date("2025-01-13T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-15T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-14T10:00:00Z").getTime() },
    ];
    expect(calculateCurrentStreak(sets)).toBe(3);
  });
});

describe("calculateLongestStreak", () => {
  it("returns 0 for empty sets", () => {
    expect(calculateLongestStreak([])).toBe(0);
  });

  it("returns 1 for single workout", () => {
    const sets = [{ performedAt: new Date("2025-01-15T10:00:00Z").getTime() }];
    expect(calculateLongestStreak(sets)).toBe(1);
  });

  it("counts consecutive days", () => {
    const sets = [
      { performedAt: new Date("2025-01-01T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-02T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-03T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-04T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-05T10:00:00Z").getTime() },
    ];
    expect(calculateLongestStreak(sets)).toBe(5);
  });

  it("finds longest streak in history", () => {
    const sets = [
      // First streak: 2 days
      { performedAt: new Date("2025-01-01T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-02T10:00:00Z").getTime() },
      // Gap
      // Second streak: 4 days (longest)
      { performedAt: new Date("2025-01-10T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-11T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-12T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-13T10:00:00Z").getTime() },
      // Gap
      // Third streak: 3 days
      { performedAt: new Date("2025-01-20T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-21T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-22T10:00:00Z").getTime() },
    ];
    expect(calculateLongestStreak(sets)).toBe(4);
  });

  it("handles multiple sets per day", () => {
    const sets = [
      { performedAt: new Date("2025-01-01T08:00:00Z").getTime() },
      { performedAt: new Date("2025-01-01T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-01T14:00:00Z").getTime() },
      { performedAt: new Date("2025-01-02T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-03T10:00:00Z").getTime() },
    ];
    expect(calculateLongestStreak(sets)).toBe(3);
  });

  it("handles unsorted sets", () => {
    const sets = [
      { performedAt: new Date("2025-01-03T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-01T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-02T10:00:00Z").getTime() },
    ];
    expect(calculateLongestStreak(sets)).toBe(3);
  });

  it("correctly identifies single-day streaks when all are non-consecutive", () => {
    const sets = [
      { performedAt: new Date("2025-01-01T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-03T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-05T10:00:00Z").getTime() },
      { performedAt: new Date("2025-01-07T10:00:00Z").getTime() },
    ];
    expect(calculateLongestStreak(sets)).toBe(1);
  });
});

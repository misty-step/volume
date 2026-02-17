import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatTimeAgo,
  getTodayRange,
  getTodayRangeForTimezoneOffset,
} from "./date-utils";

describe("date-utils", () => {
  describe("getTodayRange", () => {
    beforeEach(() => {
      // Set a fixed time for testing: 2025-10-07 14:30:00 UTC
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-10-07T14:30:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns midnight to midnight timestamps for today", () => {
      const { start, end } = getTodayRange();

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Start should be at midnight (00:00:00.000)
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(startDate.getSeconds()).toBe(0);
      expect(startDate.getMilliseconds()).toBe(0);

      // End should be at 23:59:59.999
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
      expect(endDate.getMilliseconds()).toBe(999);

      // Start and end should be on the same date
      expect(startDate.getDate()).toBe(endDate.getDate());
      expect(startDate.getMonth()).toBe(endDate.getMonth());
      expect(startDate.getFullYear()).toBe(endDate.getFullYear());
    });

    it("returns timestamps that span exactly 24 hours minus 1ms", () => {
      const { start, end } = getTodayRange();

      const duration = end - start;
      const expectedDuration = 24 * 60 * 60 * 1000 - 1; // 24 hours - 1ms

      expect(duration).toBe(expectedDuration);
    });

    it("filters sets correctly using the range", () => {
      const { start, end } = getTodayRange();

      // Mock sets with different timestamps
      const yesterday = start - 1000; // 1 second before midnight
      const todayMorning = start + 1000; // 1 second after midnight
      const todayNoon = start + 12 * 60 * 60 * 1000; // Noon
      const todayEvening = end - 1000; // 1 second before midnight
      const tomorrow = end + 1000; // 1 second after midnight

      const mockSets = [
        { performedAt: yesterday },
        { performedAt: todayMorning },
        { performedAt: todayNoon },
        { performedAt: todayEvening },
        { performedAt: tomorrow },
      ];

      const todaysSets = mockSets.filter(
        (s) => s.performedAt >= start && s.performedAt <= end
      );

      // Should only include the 3 sets from today
      expect(todaysSets).toHaveLength(3);
      expect(todaysSets.map((s) => s.performedAt)).toEqual([
        todayMorning,
        todayNoon,
        todayEvening,
      ]);
    });

    it("handles edge case at midnight boundary", () => {
      // Set time to exactly midnight
      vi.setSystemTime(new Date("2025-10-07T00:00:00Z"));

      const { start, end } = getTodayRange();

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Should still be the same day
      expect(startDate.getDate()).toBe(endDate.getDate());
      expect(start).toBeLessThan(end);
    });

    it("handles edge case at end of day", () => {
      // Set time to 23:59:59
      vi.setSystemTime(new Date("2025-10-07T23:59:59Z"));

      const { start, end } = getTodayRange();

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Should still be the same day
      expect(startDate.getDate()).toBe(endDate.getDate());
      expect(start).toBeLessThan(end);
    });
  });

  describe("getTodayRangeForTimezoneOffset", () => {
    it("returns UTC timestamps that map to the user's local midnight boundaries", () => {
      const nowMs = Date.parse("2025-10-07T14:30:00.000Z");

      // UTC-6 (behind UTC): local day starts at 06:00Z and ends next day 05:59:59.999Z
      const chicago = getTodayRangeForTimezoneOffset(360, nowMs);
      expect(chicago.start).toBe(Date.parse("2025-10-07T06:00:00.000Z"));
      expect(chicago.end).toBe(Date.parse("2025-10-08T05:59:59.999Z"));

      // UTC+5:30 (ahead of UTC): local day starts previous day 18:30Z and ends 18:29:59.999Z
      const kolkata = getTodayRangeForTimezoneOffset(-330, nowMs);
      expect(kolkata.start).toBe(Date.parse("2025-10-06T18:30:00.000Z"));
      expect(kolkata.end).toBe(Date.parse("2025-10-07T18:29:59.999Z"));
    });
  });

  describe("formatTimeAgo", () => {
    beforeEach(() => {
      // Set a fixed time for testing: 2025-10-07 14:30:00 UTC
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-10-07T14:30:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe("terminal format (default)", () => {
      it("formats seconds ago", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 5000)).toBe("5 SEC AGO");
        expect(formatTimeAgo(now - 30000)).toBe("30 SEC AGO");
        expect(formatTimeAgo(now - 59000)).toBe("59 SEC AGO");
      });

      it("formats 0 seconds as '0 SEC AGO'", () => {
        const now = Date.now();
        expect(formatTimeAgo(now)).toBe("0 SEC AGO");
      });

      it("formats minutes ago", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 60000)).toBe("1 MIN AGO");
        expect(formatTimeAgo(now - 300000)).toBe("5 MIN AGO");
        expect(formatTimeAgo(now - 1800000)).toBe("30 MIN AGO");
        expect(formatTimeAgo(now - 3540000)).toBe("59 MIN AGO");
      });

      it("formats hours ago", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 3600000)).toBe("1 HR AGO");
        expect(formatTimeAgo(now - 7200000)).toBe("2 HR AGO");
        expect(formatTimeAgo(now - 43200000)).toBe("12 HR AGO");
        expect(formatTimeAgo(now - 82800000)).toBe("23 HR AGO");
      });

      it("formats days ago with singular/plural", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 86400000)).toBe("1 DAY AGO");
        expect(formatTimeAgo(now - 172800000)).toBe("2 DAYS AGO");
        expect(formatTimeAgo(now - 604800000)).toBe("7 DAYS AGO");
        expect(formatTimeAgo(now - 2592000000)).toBe("30 DAYS AGO");
      });

      it("handles boundary at 60 seconds", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 59999)).toBe("59 SEC AGO");
        expect(formatTimeAgo(now - 60000)).toBe("1 MIN AGO");
      });

      it("handles boundary at 60 minutes", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 3599999)).toBe("59 MIN AGO");
        expect(formatTimeAgo(now - 3600000)).toBe("1 HR AGO");
      });

      it("handles boundary at 24 hours", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 86399999)).toBe("23 HR AGO");
        expect(formatTimeAgo(now - 86400000)).toBe("1 DAY AGO");
      });

      it("defaults to terminal format when format not specified", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 300000)).toBe("5 MIN AGO");
      });
    });

    describe("compact format", () => {
      it("formats recent time as 'JUST NOW'", () => {
        const now = Date.now();
        expect(formatTimeAgo(now, "compact")).toBe("JUST NOW");
        expect(formatTimeAgo(now - 5000, "compact")).toBe("JUST NOW");
        expect(formatTimeAgo(now - 30000, "compact")).toBe("JUST NOW");
        expect(formatTimeAgo(now - 59000, "compact")).toBe("JUST NOW");
      });

      it("formats minutes ago in compact style", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 60000, "compact")).toBe("1M AGO");
        expect(formatTimeAgo(now - 300000, "compact")).toBe("5M AGO");
        expect(formatTimeAgo(now - 1800000, "compact")).toBe("30M AGO");
        expect(formatTimeAgo(now - 3540000, "compact")).toBe("59M AGO");
      });

      it("formats hours ago in compact style", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 3600000, "compact")).toBe("1H AGO");
        expect(formatTimeAgo(now - 7200000, "compact")).toBe("2H AGO");
        expect(formatTimeAgo(now - 43200000, "compact")).toBe("12H AGO");
        expect(formatTimeAgo(now - 82800000, "compact")).toBe("23H AGO");
      });

      it("switches to HH:MM format after 24 hours", () => {
        const now = Date.now();
        const yesterday = now - 86400000; // Exactly 24 hours ago

        const result = formatTimeAgo(yesterday, "compact");
        // Should be HH:MM format in 24-hour time (local timezone)
        expect(result).toMatch(/^\d{2}:\d{2}$/);

        // Calculate expected local time
        const date = new Date(yesterday);
        const expected = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        expect(result).toBe(expected);
      });

      it("shows HH:MM for older timestamps", () => {
        const now = Date.now();
        const twoDaysAgo = now - 172800000; // 2 days ago
        const weekAgo = now - 604800000; // 7 days ago

        // Calculate expected local times
        const expected2Days = `${new Date(twoDaysAgo).getHours().toString().padStart(2, "0")}:${new Date(twoDaysAgo).getMinutes().toString().padStart(2, "0")}`;
        const expectedWeek = `${new Date(weekAgo).getHours().toString().padStart(2, "0")}:${new Date(weekAgo).getMinutes().toString().padStart(2, "0")}`;

        expect(formatTimeAgo(twoDaysAgo, "compact")).toBe(expected2Days);
        expect(formatTimeAgo(weekAgo, "compact")).toBe(expectedWeek);
      });

      it("uses local time not UTC for HH:MM format", () => {
        // Create a timestamp >24h ago to trigger HH:MM format
        // Fake now is Oct 7 14:30 UTC, so use Oct 5 19:30 UTC (>24h ago)
        const timestamp = new Date("2025-10-05T19:30:00Z").getTime();
        const result = formatTimeAgo(timestamp, "compact");

        // Should match local time, not UTC
        const expectedHours = new Date(timestamp)
          .getHours()
          .toString()
          .padStart(2, "0");
        const expectedMinutes = new Date(timestamp)
          .getMinutes()
          .toString()
          .padStart(2, "0");
        const expected = `${expectedHours}:${expectedMinutes}`;

        expect(result).toBe(expected);
        // In a timezone like PST (UTC-8), 19:30 UTC = 11:30 PST
        // The test validates it shows local time, not "19:30" UTC
      });

      it("handles boundary at 60 seconds (switches to 1M AGO)", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 59999, "compact")).toBe("JUST NOW");
        expect(formatTimeAgo(now - 60000, "compact")).toBe("1M AGO");
      });

      it("handles boundary at 60 minutes (switches to 1H AGO)", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 3599999, "compact")).toBe("59M AGO");
        expect(formatTimeAgo(now - 3600000, "compact")).toBe("1H AGO");
      });

      it("handles boundary at 24 hours (switches to HH:MM)", () => {
        const now = Date.now();
        expect(formatTimeAgo(now - 86399999, "compact")).toBe("23H AGO");

        // Calculate expected local time for exactly 24h ago
        const yesterday = now - 86400000;
        const expected = `${new Date(yesterday).getHours().toString().padStart(2, "0")}:${new Date(yesterday).getMinutes().toString().padStart(2, "0")}`;
        expect(formatTimeAgo(yesterday, "compact")).toBe(expected);
      });
    });

    describe("edge cases", () => {
      it("handles future timestamps as 0 SEC AGO / JUST NOW", () => {
        const now = Date.now();
        const future = now + 5000;

        // Negative seconds become 0 due to Math.floor
        expect(formatTimeAgo(future, "terminal")).toBe("0 SEC AGO");
        expect(formatTimeAgo(future, "compact")).toBe("JUST NOW");
      });

      it("maintains precision at time boundaries", () => {
        const now = Date.now();

        // Just under 1 minute
        expect(formatTimeAgo(now - 59999, "terminal")).toBe("59 SEC AGO");

        // Exactly 1 minute
        expect(formatTimeAgo(now - 60000, "terminal")).toBe("1 MIN AGO");

        // Just under 1 hour
        expect(formatTimeAgo(now - 3599999, "terminal")).toBe("59 MIN AGO");

        // Exactly 1 hour
        expect(formatTimeAgo(now - 3600000, "terminal")).toBe("1 HR AGO");
      });

      it("formats very old timestamps correctly", () => {
        const now = Date.now();
        const oneYearAgo = now - 31536000000; // 365 days

        expect(formatTimeAgo(oneYearAgo, "terminal")).toBe("365 DAYS AGO");

        // Calculate expected local time
        const expected = `${new Date(oneYearAgo).getHours().toString().padStart(2, "0")}:${new Date(oneYearAgo).getMinutes().toString().padStart(2, "0")}`;
        expect(formatTimeAgo(oneYearAgo, "compact")).toBe(expected);
      });
    });
  });
});

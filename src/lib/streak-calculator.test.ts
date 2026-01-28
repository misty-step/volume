import { describe, it, expect } from "vitest";
import {
  calculateStreak,
  getStreakMilestone,
  formatStreak,
} from "./streak-calculator";
import { Set } from "@/types/domain";

// Helper to create a set for a specific day offset from today (UTC)
function createSetForDay(daysAgo: number): Set {
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const targetTimestamp = todayUtc - daysAgo * 24 * 60 * 60 * 1000;
  return {
    _id: `set-${daysAgo}` as any,
    exerciseId: "ex1" as any,
    reps: 10,
    weight: 135,
    performedAt: targetTimestamp,
    userId: "user1",
  };
}

describe("calculateStreak", () => {
  it("returns 0 for empty set list", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("returns 1 for workout today only", () => {
    const sets = [createSetForDay(0)]; // Today
    expect(calculateStreak(sets)).toBe(1);
  });

  it("returns 1 for workout yesterday only", () => {
    const sets = [createSetForDay(1)]; // Yesterday
    expect(calculateStreak(sets)).toBe(1);
  });

  it("returns 0 if last workout was 2 days ago", () => {
    const sets = [createSetForDay(2)]; // 2 days ago
    expect(calculateStreak(sets)).toBe(0);
  });

  it("counts consecutive days from today", () => {
    const sets = [
      createSetForDay(0), // Today
      createSetForDay(1), // Yesterday
      createSetForDay(2), // 2 days ago
      createSetForDay(3), // 3 days ago
    ];
    expect(calculateStreak(sets)).toBe(4);
  });

  it("counts consecutive days from yesterday", () => {
    const sets = [
      createSetForDay(1), // Yesterday
      createSetForDay(2), // 2 days ago
      createSetForDay(3), // 3 days ago
    ];
    expect(calculateStreak(sets)).toBe(3);
  });

  it("breaks streak on gap", () => {
    const sets = [
      createSetForDay(0), // Today
      createSetForDay(1), // Yesterday
      // GAP: 2 days ago missing
      createSetForDay(3), // 3 days ago
      createSetForDay(4), // 4 days ago
    ];
    expect(calculateStreak(sets)).toBe(2); // Only counts today and yesterday
  });

  it("handles multiple sets on same day", () => {
    const now = new Date();
    const todayUtcMidnight = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );
    const sets: Set[] = [
      {
        _id: "set1" as any,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 135,
        performedAt: todayUtcMidnight + 1000, // 1 second after UTC midnight
        userId: "user1",
      },
      {
        _id: "set2" as any,
        exerciseId: "ex1" as any,
        reps: 12,
        weight: 135,
        performedAt: todayUtcMidnight + 3600000, // 1 hour after UTC midnight
        userId: "user1",
      },
      {
        _id: "set3" as any,
        exerciseId: "ex1" as any,
        reps: 8,
        weight: 135,
        performedAt: todayUtcMidnight + 86399000, // 1 second before UTC day ends
        userId: "user1",
      },
    ];
    expect(calculateStreak(sets)).toBe(1); // All same day = 1 day streak
  });

  it("handles sets in random order", () => {
    const sets = [
      createSetForDay(2), // Out of order
      createSetForDay(0), // Today
      createSetForDay(3), // Out of order
      createSetForDay(1), // Yesterday
    ];
    expect(calculateStreak(sets)).toBe(4);
  });

  it("calculates 7-day streak correctly", () => {
    const sets = Array.from({ length: 7 }, (_, i) => createSetForDay(i));
    expect(calculateStreak(sets)).toBe(7);
  });

  it("calculates 30-day streak correctly", () => {
    const sets = Array.from({ length: 30 }, (_, i) => createSetForDay(i));
    expect(calculateStreak(sets)).toBe(30);
  });

  it("handles old workouts beyond streak", () => {
    const sets = [
      createSetForDay(0), // Today
      createSetForDay(1), // Yesterday
      createSetForDay(2), // 2 days ago
      // GAP
      createSetForDay(10), // Old workout (doesn't affect current streak)
      createSetForDay(20), // Older workout
    ];
    expect(calculateStreak(sets)).toBe(3);
  });

  it("timezone edge case: handles sets near midnight", () => {
    const now = new Date();
    const todayUtcMidnight = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );
    const yesterdayUtcMidnight = todayUtcMidnight - 24 * 60 * 60 * 1000;

    const sets: Set[] = [
      {
        _id: "set1" as any,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 135,
        performedAt: todayUtcMidnight + 1000, // Just after UTC midnight today
        userId: "user1",
      },
      {
        _id: "set2" as any,
        exerciseId: "ex1" as any,
        reps: 10,
        weight: 135,
        performedAt: yesterdayUtcMidnight + 86399000, // Just before UTC midnight yesterday ends
        userId: "user1",
      },
    ];

    expect(calculateStreak(sets)).toBe(2); // Should count as 2 different days
  });
});

describe("getStreakMilestone", () => {
  it("returns null for streaks < 7", () => {
    expect(getStreakMilestone(0)).toBeNull();
    expect(getStreakMilestone(1)).toBeNull();
    expect(getStreakMilestone(6)).toBeNull();
  });

  it("returns 'week' for 7-29 day streaks", () => {
    expect(getStreakMilestone(7)).toBe("week");
    expect(getStreakMilestone(15)).toBe("week");
    expect(getStreakMilestone(29)).toBe("week");
  });

  it("returns 'month' for 30-99 day streaks", () => {
    expect(getStreakMilestone(30)).toBe("month");
    expect(getStreakMilestone(50)).toBe("month");
    expect(getStreakMilestone(99)).toBe("month");
  });

  it("returns 'hundred' for 100+ day streaks", () => {
    expect(getStreakMilestone(100)).toBe("hundred");
    expect(getStreakMilestone(365)).toBe("hundred");
  });
});

describe("formatStreak", () => {
  it("formats single day correctly", () => {
    expect(formatStreak(1)).toBe("🔥 1 Day Streak");
  });

  it("formats multiple days correctly", () => {
    expect(formatStreak(2)).toBe("🔥 2 Days Streak");
    expect(formatStreak(7)).toBe("🔥 7 Days Streak");
    expect(formatStreak(30)).toBe("🔥 30 Days Streak");
    expect(formatStreak(100)).toBe("🔥 100 Days Streak");
  });

  it("includes fire emoji", () => {
    expect(formatStreak(5)).toContain("🔥");
  });
});

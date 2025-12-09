import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLastSet } from "./useLastSet";
import * as convexReact from "convex/react";
import type { Set } from "@/types/domain";

// Mock convex/react
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

describe("useLastSet", () => {
  // Test data organized by exercise for clearer mocking
  const exercise1Sets: Set[] = [
    {
      _id: "set1" as any,
      _creationTime: 1000,
      userId: "user1",
      exerciseId: "exercise1" as any,
      reps: 10,
      weight: 135,
      unit: "lbs",
      performedAt: Date.now() - 60000, // 1 minute ago (most recent)
    },
    {
      _id: "set3" as any,
      _creationTime: 3000,
      userId: "user1",
      exerciseId: "exercise1" as any,
      reps: 8,
      weight: 140,
      unit: "lbs",
      performedAt: Date.now() - 7200000, // 2 hours ago
    },
  ];

  const exercise2Sets: Set[] = [
    {
      _id: "set2" as any,
      _creationTime: 2000,
      userId: "user1",
      exerciseId: "exercise2" as any,
      reps: 20,
      weight: undefined,
      unit: undefined,
      performedAt: Date.now() - 3600000, // 1 hour ago
    },
  ];

  /**
   * Helper to mock useQuery based on the exerciseId passed.
   * The hook now passes exerciseId directly to the query, so we simulate
   * the server-side filtering behavior.
   */
  const mockQueryByExercise = () => {
    vi.mocked(convexReact.useQuery).mockImplementation((_queryFn, args) => {
      // When "skip" is passed (null exerciseId), return undefined
      if (args === "skip") return undefined;
      // When args has an exerciseId, return filtered sets
      if (args && typeof args === "object" && "exerciseId" in args) {
        const exId = args.exerciseId as string;
        if (exId === "exercise1") return exercise1Sets;
        if (exId === "exercise2") return exercise2Sets;
        return []; // No matches for unknown exerciseId
      }
      return [];
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no exercise selected", () => {
    mockQueryByExercise();

    const { result } = renderHook(() => useLastSet(null));

    // useQuery returns undefined when "skip" is passed
    expect(result.current.lastSet).toBeNull();
  });

  it("returns null when no sets exist", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([]);

    const { result } = renderHook(() => useLastSet("exercise1"));

    expect(result.current.lastSet).toBeNull();
  });

  it("returns null when query is undefined", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);

    const { result } = renderHook(() => useLastSet("exercise1"));

    expect(result.current.lastSet).toBeNull();
  });

  it("returns most recent set for exercise", () => {
    mockQueryByExercise();

    const { result } = renderHook(() => useLastSet("exercise1"));

    // Should return set1 (most recent for exercise1)
    expect(result.current.lastSet).toEqual(exercise1Sets[0]);
    expect(result.current.lastSet?.performedAt).toBe(
      exercise1Sets[0].performedAt
    );
  });

  it("filters sets by exerciseId correctly", () => {
    mockQueryByExercise();

    const { result } = renderHook(() => useLastSet("exercise2"));

    // Should return set2 (only set for exercise2)
    expect(result.current.lastSet).toEqual(exercise2Sets[0]);
    expect(result.current.lastSet?.exerciseId).toBe("exercise2");
  });

  it("handles sets without weight", () => {
    mockQueryByExercise();

    const { result } = renderHook(() => useLastSet("exercise2"));

    expect(result.current.lastSet?.weight).toBeUndefined();
    expect(result.current.lastSet?.unit).toBeUndefined();
  });

  it("returns null when no sets match exerciseId", () => {
    mockQueryByExercise();

    const { result } = renderHook(() => useLastSet("nonexistent"));

    expect(result.current.lastSet).toBeNull();
  });

  describe("formatTimeAgo", () => {
    it("formats seconds as 'X SEC AGO'", () => {
      vi.mocked(convexReact.useQuery).mockReturnValue([]);

      const { result } = renderHook(() => useLastSet(null));

      const now = Date.now();
      expect(result.current.formatTimeAgo(now - 5000)).toBe("5 SEC AGO");
      expect(result.current.formatTimeAgo(now - 30000)).toBe("30 SEC AGO");
      expect(result.current.formatTimeAgo(now - 59000)).toBe("59 SEC AGO");
    });

    it("formats minutes as 'X MIN AGO'", () => {
      vi.mocked(convexReact.useQuery).mockReturnValue([]);

      const { result } = renderHook(() => useLastSet(null));

      const now = Date.now();
      expect(result.current.formatTimeAgo(now - 60000)).toBe("1 MIN AGO");
      expect(result.current.formatTimeAgo(now - 120000)).toBe("2 MIN AGO");
      expect(result.current.formatTimeAgo(now - 1800000)).toBe("30 MIN AGO");
      expect(result.current.formatTimeAgo(now - 3599000)).toBe("59 MIN AGO");
    });

    it("formats hours as 'X HR AGO'", () => {
      vi.mocked(convexReact.useQuery).mockReturnValue([]);

      const { result } = renderHook(() => useLastSet(null));

      const now = Date.now();
      expect(result.current.formatTimeAgo(now - 3600000)).toBe("1 HR AGO");
      expect(result.current.formatTimeAgo(now - 7200000)).toBe("2 HR AGO");
      expect(result.current.formatTimeAgo(now - 18000000)).toBe("5 HR AGO");
      expect(result.current.formatTimeAgo(now - 86399000)).toBe("23 HR AGO");
    });

    it("formats days as 'X DAY(S) AGO'", () => {
      vi.mocked(convexReact.useQuery).mockReturnValue([]);

      const { result } = renderHook(() => useLastSet(null));

      const now = Date.now();
      expect(result.current.formatTimeAgo(now - 86400000)).toBe("1 DAY AGO");
      expect(result.current.formatTimeAgo(now - 172800000)).toBe("2 DAYS AGO");
      expect(result.current.formatTimeAgo(now - 604800000)).toBe("7 DAYS AGO");
      expect(result.current.formatTimeAgo(now - 2592000000)).toBe(
        "30 DAYS AGO"
      );
    });

    it("handles edge case of 0 seconds", () => {
      vi.mocked(convexReact.useQuery).mockReturnValue([]);

      const { result } = renderHook(() => useLastSet(null));

      const now = Date.now();
      expect(result.current.formatTimeAgo(now)).toBe("0 SEC AGO");
    });
  });

  it("recalculates lastSet when exerciseId changes", () => {
    mockQueryByExercise();

    const { result, rerender } = renderHook(
      ({ exerciseId }) => useLastSet(exerciseId),
      { initialProps: { exerciseId: "exercise1" } }
    );

    // Initially returns last set for exercise1
    expect(result.current.lastSet?.exerciseId).toBe("exercise1");

    // Change to exercise2
    rerender({ exerciseId: "exercise2" });

    // Should now return last set for exercise2
    expect(result.current.lastSet?.exerciseId).toBe("exercise2");
  });

  it("recalculates lastSet when sets data changes", () => {
    // Initial mock returns exercise1Sets
    vi.mocked(convexReact.useQuery).mockReturnValue(exercise1Sets);

    const { result, rerender } = renderHook(() => useLastSet("exercise1"));

    const initialSet = result.current.lastSet;
    expect(initialSet?._id).toBe("set1");

    // Simulate new data from server (new most recent set)
    const newSet: Set = {
      _id: "set4" as any,
      _creationTime: 4000,
      userId: "user1",
      exerciseId: "exercise1" as any,
      reps: 12,
      weight: 145,
      unit: "lbs",
      performedAt: Date.now() - 1000, // Just now
    };
    vi.mocked(convexReact.useQuery).mockReturnValue([newSet, ...exercise1Sets]);

    rerender();

    // Should return the new most recent set
    expect(result.current.lastSet).not.toEqual(initialSet);
    expect(result.current.lastSet?._id).toBe("set4");
  });
});

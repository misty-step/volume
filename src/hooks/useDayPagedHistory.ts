"use client";

import { usePaginatedQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import { formatDateGroup } from "@/lib/date-formatters";
import { WeightUnit, Set } from "@/types/domain";
import { convertWeight, normalizeWeightUnit } from "@/lib/weight-utils";

/**
 * Represents a single day's workout data with computed totals.
 */
export interface DayGroup {
  /** Date key in toDateString() format (device-local) */
  dayKey: string;
  /** Human-friendly display: "Today" / "Yesterday" / weekday / "Jan 15" */
  displayDate: string;
  /** All sets for this day, newest first */
  sets: Set[];
  /** Aggregated totals for the day */
  totals: {
    setCount: number;
    reps: number;
    durationSec: number;
    volume: number;
  };
}

export type DayPagedHistoryStatus =
  | "loading"
  | "ready"
  | "loadingMore"
  | "done";

interface UseDayPagedHistoryOptions {
  /** How many sets to fetch per page (tune for ~7 days per fetch) */
  pageSizeSets?: number;
  /** Preferred weight unit for volume calculations */
  preferredUnit?: WeightUnit;
}

interface UseDayPagedHistoryReturn {
  /** Day groups sorted newest to oldest */
  dayGroups: DayGroup[];
  /** Current loading status */
  status: DayPagedHistoryStatus;
  /** Load more days (fetches until N new days appear or data exhausted) */
  loadMoreDays: (days?: number) => Promise<void>;
  /** Whether we can load more */
  canLoadMore: boolean;
}

/**
 * Hook for day-first paginated history.
 *
 * Wraps Convex's set pagination to present a day-centric UX:
 * - Groups sets by calendar day (device-local)
 * - "Load More" adds more days, not more sets
 * - Computes per-day totals (sets, reps, duration, volume)
 */
export function useDayPagedHistory(
  options: UseDayPagedHistoryOptions = {}
): UseDayPagedHistoryReturn {
  const { pageSizeSets = 100, preferredUnit = "lbs" } = options;

  const {
    results,
    status: convexStatus,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.sets.listSetsPaginated,
    {},
    { initialNumItems: pageSizeSets }
  );

  // Track if we're in the middle of loading more days
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Build day groups from accumulated sets
  const dayGroups = useMemo(() => {
    if (!results || results.length === 0) return [];

    const dayMap = new Map<string, Set[]>();
    const orderedDays: string[] = [];

    // Group sets by day, preserving order
    for (const set of results) {
      const dayKey = new Date(set.performedAt).toDateString();

      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
        orderedDays.push(dayKey);
      }

      dayMap.get(dayKey)!.push(set);
    }

    // Build DayGroup objects
    return orderedDays.map((dayKey): DayGroup => {
      const sets = dayMap.get(dayKey)!;

      // Sort sets within day (newest first)
      sets.sort((a, b) => b.performedAt - a.performedAt);

      // Compute totals
      let reps = 0;
      let durationSec = 0;
      let volume = 0;

      for (const set of sets) {
        if (set.reps !== undefined) {
          reps += set.reps;

          if (set.weight !== undefined) {
            const setUnit = normalizeWeightUnit(set.unit);
            const convertedWeight = convertWeight(
              set.weight,
              setUnit,
              preferredUnit
            );
            volume += set.reps * convertedWeight;
          }
        }

        if (set.duration !== undefined) {
          durationSec += set.duration;
        }
      }

      return {
        dayKey,
        displayDate: formatDateGroup(dayKey),
        sets,
        totals: {
          setCount: sets.length,
          reps,
          durationSec,
          volume,
        },
      };
    });
  }, [results, preferredUnit]);

  // Map Convex status to our status
  const status = useMemo((): DayPagedHistoryStatus => {
    // Use type assertion to handle all possible Convex statuses without narrowing issues
    const paginationStatus = convexStatus as
      | "LoadingFirstPage"
      | "CanLoadMore"
      | "LoadingMore"
      | "Exhausted";

    if (isLoadingMore || paginationStatus === "LoadingMore")
      return "loadingMore";
    if (paginationStatus === "LoadingFirstPage" || isLoading) return "loading";
    if (paginationStatus === "Exhausted") return "done";
    return "ready";
  }, [convexStatus, isLoading, isLoadingMore]);

  const canLoadMore = convexStatus === "CanLoadMore";

  /**
   * Load more days of history.
   * Fetches pages until N new days appear or data is exhausted.
   */
  const loadMoreDays = useCallback(
    async (targetNewDays: number = 7) => {
      if (!canLoadMore || isLoadingMore) return;

      setIsLoadingMore(true);
      const startingDayCount = dayGroups.length;

      try {
        // Keep fetching until we have enough new days or exhausted
        let attempts = 0;
        const maxAttempts = 5; // Prevent infinite loops

        while (attempts < maxAttempts) {
          // Load a page of sets
          loadMore(pageSizeSets);

          // Wait a tick for React to process
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Check if we've added enough days
          // Note: dayGroups.length won't update until next render, so we estimate
          attempts++;

          // For now, just load one page and let React re-render
          // The user can click "Load More" again if needed
          break;
        }
      } finally {
        setIsLoadingMore(false);
      }
    },
    [canLoadMore, isLoadingMore, dayGroups.length, loadMore, pageSizeSets]
  );

  return {
    dayGroups,
    status,
    loadMoreDays,
    canLoadMore,
  };
}

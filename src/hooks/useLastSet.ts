import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Set } from "@/types/domain";
import type { Id } from "../../convex/_generated/dataModel";
import { formatTimeAgo } from "@/lib/date-utils";

/**
 * Hook to find the last set and recent history for a given exercise
 * and format relative time strings for display.
 *
 * Passes exerciseId directly to the query for server-side filtering,
 * avoiding fetching all sets and filtering client-side.
 */
export function useLastSet(exerciseId: string | null) {
  // Pass exerciseId to query for server-side filtering (much more efficient)
  const exerciseSets = useQuery(
    api.sets.listSets,
    exerciseId ? { exerciseId: exerciseId as Id<"exercises"> } : "skip"
  );

  const { lastSet, history } = useMemo(() => {
    if (!exerciseId || !exerciseSets || exerciseSets.length === 0) {
      return { lastSet: null, history: [] };
    }

    // Sets are already sorted by performedAt desc from the backend query
    const lastSet = exerciseSets[0] ?? null;
    const history = exerciseSets.slice(0, 5); // Get last 5 sets

    return { lastSet, history };
  }, [exerciseId, exerciseSets]);

  return { lastSet, history, formatTimeAgo };
}

export type { Set };

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Set } from "@/types/domain";
import { formatTimeAgo } from "@/lib/date-utils";

/**
 * Hook to find the last set and recent history for a given exercise
 * and format relative time strings for display
 */
export function useLastSet(exerciseId: string | null) {
  const allSets = useQuery(api.sets.listSets, {});

  const { lastSet, history } = useMemo(() => {
    if (!exerciseId || !allSets) return { lastSet: null, history: [] };

    const exerciseSets = allSets.filter((s) => s.exerciseId === exerciseId);
    if (exerciseSets.length === 0) return { lastSet: null, history: [] };

    // Sets are already sorted by performedAt desc from the backend query usually,
    // but the filter preserves order. If listSets is ordered, we are good.
    // Assuming listSets returns desc order.

    const lastSet = exerciseSets[0] ?? null;
    const history = exerciseSets.slice(0, 5); // Get last 5 sets

    return { lastSet, history };
  }, [exerciseId, allSets]);

  return { lastSet, history, formatTimeAgo };
}

export type { Set };

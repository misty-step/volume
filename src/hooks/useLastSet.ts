import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Set } from "@/types/domain";
import { formatTimeAgo } from "@/lib/date-utils";

/**
 * Hook to find the last set logged for a given exercise
 * and format relative time strings for display
 */
export function useLastSet(exerciseId: string | null) {
  const allSets = useQuery(api.sets.listSets, {});

  const lastSet = useMemo(() => {
    if (!exerciseId || !allSets) return null;
    const exerciseSets = allSets.filter(
      (s: any) => s.exerciseId === exerciseId
    );
    if (exerciseSets.length === 0) return null;
    return exerciseSets[0]; // Already sorted by performedAt desc
  }, [exerciseId, allSets]);

  return { lastSet, formatTimeAgo };
}

export type { Set };

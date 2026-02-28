/**
 * Historical PR Detection
 *
 * Determines which sets in a history were PRs at the time they were logged.
 * Unlike real-time PR detection, this retroactively analyzes the full history.
 */

import { type Set } from "@/types/domain";
import { checkForPR, type PRType } from "./pr-detection";
import { type Id } from "../../convex/_generated/dataModel";

/**
 * Map of set IDs to their PR type (if they were a PR when logged)
 */
export type PRMap = Map<Id<"sets">, PRType>;

/**
 * Analyze set history to determine which sets were PRs
 *
 * For each set, compares it against all sets that came before it chronologically.
 * Returns a map of set IDs to PR types for quick lookup during rendering.
 *
 * @param sets - All sets for an exercise (must be sorted newest-first)
 * @returns Map of set IDs to PR types
 *
 * @example
 * ```typescript
 * const sets = [ // newest first
 *   { _id: 'set3', reps: 12, weight: 315, performedAt: 3 },
 *   { _id: 'set2', reps: 10, weight: 315, performedAt: 2 },
 *   { _id: 'set1', reps: 8, weight: 300, performedAt: 1 }
 * ];
 * const prMap = detectHistoricalPRs(sets);
 * prMap.get('set3') // => 'reps' (12 reps is PR over previous 10)
 * prMap.get('set2') // => null (10 reps not a PR)
 * prMap.get('set1') // => 'weight' (first set is always PR)
 * ```
 */
export function detectHistoricalPRs(sets: Set[]): PRMap {
  const prMap: PRMap = new Map();

  // Process sets from oldest to newest (reverse order)
  // This ensures we compare each set against all earlier sets
  const setsOldestFirst = [...sets].reverse();

  for (let i = 0; i < setsOldestFirst.length; i++) {
    const currentSet = setsOldestFirst[i];
    if (!currentSet) continue;
    const previousSets = setsOldestFirst.slice(0, i); // All sets before this one

    const prResult = checkForPR(currentSet, previousSets);

    if (prResult) {
      prMap.set(currentSet._id, prResult.type);
    }
  }

  return prMap;
}

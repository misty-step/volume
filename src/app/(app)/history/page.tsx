"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ChronologicalGroupedSetHistory } from "@/components/dashboard/chronological-grouped-set-history";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Id } from "../../../../convex/_generated/dataModel";
import type { Exercise } from "@/types/domain";
import { useDayPagedHistory } from "@/hooks/useDayPagedHistory";
import { useWeightUnit } from "@/contexts/WeightUnitContext";

export default function HistoryPage() {
  const { unit: preferredUnit } = useWeightUnit();

  // Use day-paged history hook for day-first pagination
  const { dayGroups, status, loadMoreDays, canLoadMore } = useDayPagedHistory({
    pageSizeSets: 100,
    preferredUnit,
  });

  // Fetch exercises for names (include deleted to show accurate history)
  const exercises = useQuery(api.exercises.listExercises, {
    includeDeleted: true,
  });

  // Build exercise Map for O(1) lookups
  const exerciseMap: Map<Id<"exercises">, Exercise> = useMemo(() => {
    if (!exercises) return new Map();
    return new Map(exercises.map((ex) => [ex._id, ex]));
  }, [exercises]);

  // Delete mutation
  const deleteSetMutation = useMutation(api.sets.deleteSet);

  // No-op: Repeat functionality not applicable in history view
  const handleRepeat = () => {};

  // Handle delete set
  const handleDelete = async (setId: Id<"sets">) => {
    await deleteSetMutation({ id: setId });
  };

  // Transform DayGroup[] to format expected by ChronologicalGroupedSetHistory
  const groupedSets = useMemo(() => {
    return dayGroups.map((day) => ({
      date: day.dayKey,
      displayDate: day.displayDate,
      sets: day.sets,
      totals: day.totals,
    }));
  }, [dayGroups]);

  // Loading state (first page) - Brutalist skeleton
  if (status === "loading") {
    return (
      <PageLayout title="Workout History">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-3 border-border p-4 animate-pulse">
              <div className="h-6 bg-concrete-gray/20 w-1/3 mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-concrete-gray/20 w-full" />
                <div className="h-4 bg-concrete-gray/20 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </PageLayout>
    );
  }

  // Empty state
  if (dayGroups.length === 0) {
    return (
      <PageLayout title="Workout History">
        <div className="border-3 border-border p-12 text-center">
          <p className="text-muted-foreground text-sm mb-2 font-mono uppercase tracking-wide">
            No workout history yet
          </p>
          <p className="text-sm mb-1 font-bold">Start your journey!</p>
          <p className="text-muted-foreground text-xs mt-2">
            Log your first set on the{" "}
            <Link href="/today" className="hover:underline font-bold">
              Dashboard
            </Link>
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Workout History">
      <ChronologicalGroupedSetHistory
        groupedSets={groupedSets}
        exerciseMap={exerciseMap}
        onRepeat={handleRepeat}
        onDelete={handleDelete}
        showRepeat={false}
        linkExercises={true}
        preferredUnit={preferredUnit}
      />

      {/* Load More button - loads more days */}
      {canLoadMore && status === "ready" && (
        <div className="flex justify-center mt-4">
          <Button onClick={() => loadMoreDays(7)} size="touch" type="button">
            Load More Days
          </Button>
        </div>
      )}

      {/* Loading more indicator */}
      {status === "loadingMore" && (
        <div className="flex justify-center mt-4">
          <div className="animate-pulse">
            <div className="px-6 py-2 bg-muted text-muted-foreground text-sm border-2 border-border font-mono uppercase">
              Loading...
            </div>
          </div>
        </div>
      )}

      {/* End of history indicator */}
      {status === "done" && dayGroups.length > 0 && (
        <div className="flex justify-center mt-4">
          <div className="px-6 py-2 text-muted-foreground text-xs font-mono uppercase">
            End of history
          </div>
        </div>
      )}
    </PageLayout>
  );
}

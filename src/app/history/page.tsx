"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChronologicalGroupedSetHistory } from "@/components/dashboard/chronological-grouped-set-history";
import { groupSetsByDay } from "@/lib/date-formatters";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Id } from "../../../convex/_generated/dataModel";
import type { Exercise } from "@/types/domain";

const PAGINATION_PAGE_SIZE = 25;

export default function HistoryPage() {
  // Fetch paginated sets
  const { results, status, loadMore } = usePaginatedQuery(
    api.sets.listSetsPaginated,
    {},
    { initialNumItems: PAGINATION_PAGE_SIZE }
  );

  // Fetch exercises for names (include deleted to show accurate history)
  // Note: Query errors automatically throw and bubble to app/error.tsx
  // Error boundary then reports to Sentry via reportError()
  const exercises = useQuery(api.exercises.listExercises, {
    includeDeleted: true,
  });

  // Build exercise Map for O(1) lookups
  const exerciseMap: Map<Id<"exercises">, Exercise> = useMemo(
    () => new Map((exercises ?? []).map((ex: any) => [ex._id, ex])),
    [exercises]
  );

  // Delete mutation
  const deleteSetMutation = useMutation(api.sets.deleteSet);

  // Group sets by day
  const groupedSets = useMemo(() => groupSetsByDay(results), [results]);

  // No-op: Repeat functionality not applicable in history view
  const handleRepeat = () => {};

  // Handle delete set
  const handleDelete = async (setId: Id<"sets">) => {
    await deleteSetMutation({ id: setId });
  };

  // Loading state (first page)
  if (status === "LoadingFirstPage") {
    return (
      <PageLayout title="Workout History">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-md p-4">
              <div className="h-6 bg-muted w-1/3 mb-3 rounded" />
              <div className="space-y-2">
                <div className="h-4 bg-muted w-full rounded" />
                <div className="h-4 bg-muted w-5/6 rounded" />
              </div>
            </div>
          ))}
        </div>
      </PageLayout>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <PageLayout title="Workout History">
        <div className="border rounded-md p-12 text-center">
          <p className="text-muted-foreground text-sm mb-2">
            No workout history yet
          </p>
          <p className="text-sm mb-1">Start your journey! 🚀</p>
          <p className="text-muted-foreground text-xs mt-2">
            Log your first set on the{" "}
            <Link href="/" className="hover:underline">
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
      />

      {/* Load More button */}
      {status === "CanLoadMore" && (
        <div className="flex justify-center">
          <Button
            onClick={() => loadMore(PAGINATION_PAGE_SIZE)}
            size="touch"
            type="button"
          >
            Load More
          </Button>
        </div>
      )}

      {/* Loading more indicator */}
      {status === "LoadingMore" && (
        <div className="flex justify-center">
          <div className="animate-pulse">
            <div className="px-6 py-2 bg-muted text-muted-foreground rounded-md text-sm border">
              Loading...
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

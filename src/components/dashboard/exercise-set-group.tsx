"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Trash2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Equal,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { BrutalistButton } from "@/components/brutalist";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { handleMutationError } from "@/lib/error-handler";
import { formatNumber } from "@/lib/number-utils";
import { formatTimestamp, formatDuration } from "@/lib/date-utils";
import type { ExerciseMetrics } from "@/lib/exercise-metrics";
import { Exercise, Set as WorkoutSet, WeightUnit } from "@/types/domain";
import { BRUTALIST_TYPOGRAPHY } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import {
  useExerciseCardData,
  type EnrichedSet,
} from "@/hooks/useExerciseCardData";
import type { ExerciseSession } from "@/lib/exercise-insights";
import { PRBadge } from "./pr-badge";
import { History } from "lucide-react";
import { ExerciseSparkline } from "./exercise-sparkline";

interface ExerciseSetGroupProps {
  exercise: Exercise;
  sets: WorkoutSet[];
  metrics: ExerciseMetrics;
  preferredUnit: WeightUnit;
  onRepeat: (set: WorkoutSet) => void;
  onDelete: (setId: Id<"sets">) => void;
  showRepeat?: boolean;
  /** Optional URL for exercise detail page (makes exercise name a link) */
  exerciseHref?: string;
}

export function ExerciseSetGroup({
  exercise,
  sets,
  metrics,
  preferredUnit,
  onRepeat,
  onDelete,
  showRepeat = true,
  exerciseHref,
}: ExerciseSetGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"sets"> | null>(null);
  const [setToDelete, setSetToDelete] = useState<WorkoutSet | null>(null);

  // Fetch enriched data for analytics features
  const {
    hasPR,
    enrichedSets,
    sessions,
    sessionDelta,
    sparklineData,
    trendDirection,
  } = useExerciseCardData(exercise._id, sets, preferredUnit);

  // Map enriched sets by ID for lookup
  const enrichedSetMap = useMemo(() => {
    const map = new Map<string, EnrichedSet>();
    for (const es of enrichedSets) {
      map.set(es._id, es);
    }
    return map;
  }, [enrichedSets]);

  // Calculate today's session stats for analytics
  const todaysStats = useMemo(() => {
    let workingWeight: number | null = null;
    let bestSetVolume = 0;
    let bestSet: WorkoutSet | null = null;

    for (const set of sets) {
      // Track working weight (max weight used)
      if (set.weight !== undefined) {
        if (workingWeight === null || set.weight > workingWeight) {
          workingWeight = set.weight;
        }

        // Track best set by volume
        if (set.reps !== undefined) {
          const volume = set.weight * set.reps;
          if (volume > bestSetVolume) {
            bestSetVolume = volume;
            bestSet = set;
          }
        }
      } else if (set.reps !== undefined && set.reps > bestSetVolume) {
        // Bodyweight: best set by reps
        bestSetVolume = set.reps;
        bestSet = set;
      }
    }

    return { workingWeight, bestSet };
  }, [sets]);

  const handleDeleteClick = (set: WorkoutSet) => {
    setSetToDelete(set);
  };

  const confirmDelete = async () => {
    if (!setToDelete) return;

    setDeletingId(setToDelete._id);
    try {
      await onDelete(setToDelete._id);
      toast.success("Set deleted");
      setSetToDelete(null);
      setDeletingId(null);
    } catch (error) {
      handleMutationError(error, "Delete Set");
      setDeletingId(null);
    }
  };

  return (
    <>
      <div
        className={cn(
          "border-3 border-concrete-black dark:border-concrete-white overflow-hidden",
          "shadow-lift dark:shadow-lift-dark"
        )}
      >
        {/* Header - Always visible, clickable to expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left px-4 py-4 bg-background hover:bg-concrete-gray/10 transition-colors"
          data-testid={`exercise-group-${exercise._id}`}
        >
          <div className="space-y-2">
            {/* Exercise Name Row */}
            <div className="flex items-start gap-3">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-danger-red mt-0.5 shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-danger-red mt-0.5 shrink-0" />
              )}
              <span className="font-display text-lg uppercase tracking-wide line-clamp-2 flex-1">
                {exercise.name}
              </span>

              {/* PR Badge */}
              {hasPR && <PRBadge size="sm" className="shrink-0" />}

              {exerciseHref && (
                <Link
                  href={exerciseHref}
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-danger-red transition-colors shrink-0"
                  aria-label={`View ${exercise.name} details`}
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Stats Row - Always show: SETS • REPS (if any) • VOLUME or TIME */}
            <div className="pl-8 flex items-baseline gap-2 flex-wrap">
              <span className="font-mono text-xs uppercase text-muted-foreground">
                {sets.length} SET{sets.length === 1 ? "" : "S"}
              </span>

              {/* Reps - always show when > 0 */}
              {metrics.totalReps > 0 && (
                <>
                  <span className="text-concrete-gray">•</span>
                  <span
                    className={BRUTALIST_TYPOGRAPHY.pairings.setWeight.number}
                  >
                    {formatNumber(metrics.totalReps)}
                  </span>
                  <span
                    className={BRUTALIST_TYPOGRAPHY.pairings.setWeight.unit}
                  >
                    REPS
                  </span>
                </>
              )}

              {/* Volume - show when > 0 */}
              {metrics.totalVolume > 0 && (
                <>
                  <span className="text-concrete-gray">•</span>
                  <span
                    className={BRUTALIST_TYPOGRAPHY.pairings.setWeight.number}
                  >
                    {formatNumber(Math.round(metrics.totalVolume))}
                  </span>
                  <span
                    className={BRUTALIST_TYPOGRAPHY.pairings.setWeight.unit}
                  >
                    {preferredUnit.toUpperCase()}
                  </span>
                </>
              )}

              {/* Duration - show when > 0 and no volume (avoid showing both volume and time) */}
              {metrics.totalDuration > 0 && metrics.totalVolume === 0 && (
                <>
                  <span className="text-concrete-gray">•</span>
                  <span
                    className={BRUTALIST_TYPOGRAPHY.pairings.setWeight.number}
                  >
                    {formatDuration(Math.round(metrics.totalDuration))}
                  </span>
                  <span
                    className={BRUTALIST_TYPOGRAPHY.pairings.setWeight.unit}
                  >
                    TIME
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Expanded content - Set list with animations */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {/* Analytics Summary - appears right after header when expanded */}
              <AnalyticsSummary
                sessionDelta={sessionDelta}
                sparklineData={sparklineData}
                trendDirection={trendDirection}
                workingWeight={todaysStats.workingWeight}
                bestSet={todaysStats.bestSet}
                preferredUnit={preferredUnit}
              />

              <div className="divide-y-2 divide-concrete-gray/30">
                {sets.map((set, index) => {
                  const isDeleting = deletingId === set._id;
                  const enrichedSet = enrichedSetMap.get(set._id);
                  const comparison = enrichedSet?.comparison;
                  const isPR = enrichedSet?.isPR ?? false;

                  return (
                    <motion.div
                      key={set._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.15 }}
                      className={cn(
                        "px-4 py-4 space-y-3 transition-colors",
                        index % 2 === 0
                          ? "bg-background"
                          : "bg-concrete-gray/5 dark:bg-concrete-gray/10",
                        isPR && "bg-danger-red/5 dark:bg-danger-red/10"
                      )}
                      data-testid={`exercise-set-item-${set._id}`}
                      data-exercise-name={exercise.name}
                    >
                      {/* Row 1: Quality indicator + Reps/Duration + Weight + Ghost data */}
                      <div className="flex items-center gap-3">
                        {/* Quality indicator */}
                        <QualityIndicator
                          quality={comparison?.quality ?? null}
                        />

                        {/* Primary data */}
                        <div className="flex items-center gap-4 font-mono text-lg flex-1">
                          {/* Reps or Duration */}
                          <div className="flex items-center gap-2">
                            {set.duration !== undefined ? (
                              <>
                                <span
                                  className="font-bold tabular-nums text-safety-orange"
                                  data-testid="set-duration-value"
                                >
                                  {formatDuration(set.duration)}
                                </span>
                                <span className="text-concrete-gray text-xs uppercase tracking-wider">
                                  TIME
                                </span>
                              </>
                            ) : (
                              <>
                                <span
                                  className="font-bold tabular-nums text-safety-orange"
                                  data-testid="set-reps-value"
                                >
                                  {set.reps}
                                </span>
                                <span
                                  className="text-concrete-gray text-xs uppercase tracking-wider"
                                  data-testid="set-reps-label"
                                >
                                  REPS
                                </span>
                              </>
                            )}
                          </div>

                          {/* Weight */}
                          {set.weight != null && (
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold tabular-nums"
                                data-testid="set-weight-value"
                              >
                                {set.weight}
                              </span>
                              <span
                                className="text-concrete-gray text-xs uppercase tracking-wider"
                                data-testid="set-weight-unit"
                              >
                                {(set.unit || preferredUnit).toUpperCase()}
                              </span>
                            </div>
                          )}

                          {/* Ghost data - comparison to last session */}
                          {comparison &&
                            (comparison.lastReps !== null ||
                              comparison.lastDuration !== null) && (
                              <GhostData
                                comparison={comparison}
                                preferredUnit={preferredUnit}
                              />
                            )}

                          {/* PR indicator for this specific set */}
                          {isPR && <PRBadge size="sm" className="ml-auto" />}
                        </div>
                      </div>

                      {/* Row 2: Time + Actions */}
                      <div className="flex items-center justify-between pl-7">
                        <span className="font-mono text-xs uppercase tracking-wider text-concrete-gray">
                          {formatTimestamp(set.performedAt).toUpperCase()}
                        </span>

                        {/* Action buttons - larger and more prominent */}
                        <div className="flex items-center gap-2">
                          {showRepeat && (
                            <BrutalistButton
                              variant="outline"
                              size="sm"
                              onClick={() => onRepeat(set)}
                              disabled={isDeleting}
                              aria-label="Repeat set"
                              className="h-9 px-3 gap-1.5"
                              data-testid={`repeat-set-btn-${set._id}`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="text-xs font-mono uppercase">
                                Repeat
                              </span>
                            </BrutalistButton>
                          )}
                          <BrutalistButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(set)}
                            disabled={isDeleting}
                            aria-label="Delete set"
                            className="h-9 w-9 p-0 text-danger-red hover:text-danger-red hover:bg-danger-red/10"
                            data-testid={`delete-set-btn-${set._id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </BrutalistButton>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* History Section - Previous sessions */}
                <HistorySection
                  sessions={sessions}
                  exerciseId={exercise._id}
                  exerciseHref={exerciseHref}
                  preferredUnit={preferredUnit}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={setToDelete !== null}
        onOpenChange={(open) => !open && setSetToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete set?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="confirm-delete-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Quality indicator showing if this set beat, matched, or underperformed vs last session.
 */
function QualityIndicator({
  quality,
}: {
  quality: "beat" | "matched" | "under" | null;
}) {
  if (!quality) {
    return <div className="w-4 h-4" />; // Spacer
  }

  const config = {
    beat: {
      icon: TrendingUp,
      className: "text-safety-orange",
      label: "Beat last session",
    },
    matched: {
      icon: Equal,
      className: "text-concrete-gray",
      label: "Matched last session",
    },
    under: {
      icon: TrendingDown,
      className: "text-danger-red/70",
      label: "Under last session",
    },
  }[quality];

  const Icon = config.icon;

  return (
    <div className={cn("shrink-0", config.className)} aria-label={config.label}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

/**
 * Ghost data showing last session's values for comparison.
 */
function GhostData({
  comparison,
  preferredUnit,
}: {
  comparison: EnrichedSet["comparison"];
  preferredUnit: WeightUnit;
}) {
  const { lastReps, lastWeight, lastDuration } = comparison;

  // Format the ghost text based on what data we have
  let ghostText = "";

  if (lastDuration !== null) {
    ghostText = `last: ${formatDuration(lastDuration)}`;
  } else if (lastReps !== null && lastWeight !== null) {
    ghostText = `last: ${lastReps} @ ${lastWeight}`;
  } else if (lastReps !== null) {
    ghostText = `last: ${lastReps} reps`;
  }

  if (!ghostText) return null;

  return (
    <span className="text-xs text-muted-foreground font-mono opacity-60">
      ({ghostText})
    </span>
  );
}

/**
 * Analytics summary showing session performance vs last session.
 * Displays delta, sparkline, working weight, and best set.
 */
function AnalyticsSummary({
  sessionDelta,
  sparklineData,
  trendDirection,
  workingWeight,
  bestSet,
  preferredUnit,
}: {
  sessionDelta: ReturnType<typeof useExerciseCardData>["sessionDelta"];
  sparklineData: ReturnType<typeof useExerciseCardData>["sparklineData"];
  trendDirection: ReturnType<typeof useExerciseCardData>["trendDirection"];
  workingWeight: number | null;
  bestSet: WorkoutSet | null;
  preferredUnit: WeightUnit;
}) {
  // Don't show analytics if no meaningful data
  if (!sessionDelta && sparklineData.length === 0 && !workingWeight && !bestSet) {
    return null;
  }

  return (
    <div className="px-4 py-3 bg-concrete-gray/5 dark:bg-concrete-gray/10 border-b-2 border-concrete-gray/30">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Session Delta - Volume/Reps change vs last session */}
        {sessionDelta && (
          <div className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              vs Last
            </div>
            <div className="flex items-baseline gap-1.5">
              {sessionDelta.direction === "up" ? (
                <TrendingUp className="w-4 h-4 text-safety-orange shrink-0" />
              ) : sessionDelta.direction === "down" ? (
                <TrendingDown className="w-4 h-4 text-danger-red/70 shrink-0" />
              ) : (
                <Equal className="w-4 h-4 text-concrete-gray shrink-0" />
              )}
              <span
                className={cn(
                  "font-mono text-sm font-bold tabular-nums",
                  sessionDelta.direction === "up" && "text-safety-orange",
                  sessionDelta.direction === "down" && "text-danger-red/70",
                  sessionDelta.direction === "same" && "text-concrete-gray"
                )}
              >
                {sessionDelta.direction === "up" && "+"}
                {sessionDelta.direction === "down" && "-"}
                {formatNumber(sessionDelta.value)}
              </span>
              <span className="font-mono text-xs text-muted-foreground uppercase">
                {sessionDelta.unit}
              </span>
              {sessionDelta.percentChange !== null && (
                <span className="font-mono text-xs text-muted-foreground">
                  ({sessionDelta.percentChange > 0 && "+"}
                  {sessionDelta.percentChange}%)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Sparkline - Trend visualization */}
        {sparklineData.length >= 2 && (
          <div className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Trend
            </div>
            <div className="flex items-center gap-2">
              <ExerciseSparkline
                data={sparklineData}
                trend={trendDirection}
                width={80}
                height={24}
              />
              <span
                className={cn(
                  "font-mono text-xs uppercase",
                  trendDirection === "up" && "text-safety-orange",
                  trendDirection === "down" && "text-danger-red/70",
                  trendDirection === "flat" && "text-concrete-gray"
                )}
              >
                {trendDirection}
              </span>
            </div>
          </div>
        )}

        {/* Working Weight - Max weight used today */}
        {workingWeight !== null && (
          <div className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Working
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-bold tabular-nums">
                {workingWeight}
              </span>
              <span className="font-mono text-xs text-muted-foreground uppercase">
                {preferredUnit}
              </span>
            </div>
          </div>
        )}

        {/* Best Set - Highest volume set today */}
        {bestSet && (
          <div className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Best Set
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-bold tabular-nums text-safety-orange">
                {bestSet.reps}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                reps
              </span>
              {bestSet.weight !== undefined && (
                <>
                  <span className="text-concrete-gray">@</span>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {bestSet.weight}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground uppercase">
                    {(bestSet.unit || preferredUnit).toLowerCase()}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * History section showing previous sessions for this exercise.
 * Displays last 3 sessions (excluding today) with summary stats.
 */
function HistorySection({
  sessions,
  exerciseId,
  exerciseHref,
  preferredUnit,
}: {
  sessions: ExerciseSession[];
  exerciseId: string;
  exerciseHref?: string;
  preferredUnit: WeightUnit;
}) {
  // Filter out today's session and take up to 3 previous sessions
  const today = new Date().toDateString();
  const previousSessions = sessions
    .filter((s) => s.dayKey !== today)
    .slice(0, 3);

  // Don't render if no history
  if (previousSessions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 bg-concrete-gray/5 dark:bg-concrete-gray/10">
      {/* History Header */}
      <div className="flex items-center gap-2 mb-2">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          History
        </span>
        {exerciseHref && (
          <Link
            href={exerciseHref}
            className="ml-auto font-mono text-xs uppercase tracking-wider text-danger-red hover:underline"
          >
            View All
          </Link>
        )}
      </div>

      {/* Session List */}
      <div className="space-y-1.5">
        {previousSessions.map((session) => {
          const hasVolume = session.totals.volume > 0;
          const hasReps = session.totals.reps > 0;
          const hasDuration = session.totals.durationSec > 0;

          return (
            <div
              key={session.dayKey}
              className="flex items-baseline gap-2 font-mono text-xs text-muted-foreground"
            >
              <span className="text-foreground/70 min-w-[4rem]">
                {session.displayDate}
              </span>
              <span className="text-concrete-gray">•</span>
              <span>{session.totals.setCount} sets</span>

              {hasReps && (
                <>
                  <span className="text-concrete-gray">•</span>
                  <span>{session.totals.reps} reps</span>
                </>
              )}

              {hasVolume && (
                <>
                  <span className="text-concrete-gray">•</span>
                  <span>
                    {formatNumber(Math.round(session.totals.volume))}{" "}
                    {preferredUnit}
                  </span>
                </>
              )}

              {hasDuration && !hasReps && (
                <>
                  <span className="text-concrete-gray">•</span>
                  <span>{formatDuration(session.totals.durationSec)}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/date-utils";
import { History, TrendingUp, Target, Zap, Calendar } from "lucide-react";
import type {
  ExerciseSession,
  ExerciseTrendSummary,
} from "@/lib/exercise-insights";

interface DetailsSectionProps {
  expanded: boolean;
  sessions: ExerciseSession[];
  trendSummary: ExerciseTrendSummary;
  unit: string;
}

/**
 * Details Section - Collapsible panel with session history and trend stats
 *
 * Shows when user taps "More details":
 * - Session history grouped by day
 * - Trend summary (working weight, avg/set, best, frequency)
 */
export function DetailsSection({
  expanded,
  sessions,
  trendSummary,
  unit,
}: DetailsSectionProps) {
  const displaySessions = sessions.slice(0, 5);

  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "mt-3 rounded-lg border-2 border-concrete-gray/30 dark:border-concrete-gray/20",
              "bg-background p-4"
            )}
          >
            {/* Two-column layout on larger screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sessions Column */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Sessions
                  </span>
                </div>

                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2">
                  {displaySessions.map((session) => (
                    <SessionRow key={session.dayKey} session={session} />
                  ))}
                  {sessions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No history yet
                    </p>
                  )}
                </div>
              </div>

              {/* Trends Column */}
              <div className="border-t md:border-t-0 md:border-l border-border/30 pt-4 md:pt-0 md:pl-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Trends
                  </span>
                </div>

                <div className="space-y-3">
                  {trendSummary.workingWeight !== null && (
                    <TrendRow
                      icon={<Target className="w-3.5 h-3.5" />}
                      label="Working weight"
                      value={`${trendSummary.workingWeight} ${unit}`}
                    />
                  )}

                  {trendSummary.repsPerSetAvg !== null && (
                    <TrendRow
                      icon={<Zap className="w-3.5 h-3.5" />}
                      label="Avg per set"
                      value={`${Math.round(trendSummary.repsPerSetAvg)} reps`}
                    />
                  )}

                  {trendSummary.bestSet && (
                    <TrendRow
                      icon={<TrendingUp className="w-3.5 h-3.5" />}
                      label="Best ever"
                      value={formatBestSet(trendSummary.bestSet, unit)}
                    />
                  )}

                  {trendSummary.frequencyThisWeek !== null && (
                    <TrendRow
                      icon={<Calendar className="w-3.5 h-3.5" />}
                      label="This week"
                      value={`${trendSummary.frequencyThisWeek}×`}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface SessionRowProps {
  session: ExerciseSession;
}

function SessionRow({ session }: SessionRowProps) {
  const isDurationBased =
    session.totals.durationSec > 0 && session.totals.reps === 0;

  return (
    <div className="flex items-start gap-3">
      {/* Date Label */}
      <div className="w-16 shrink-0">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {session.displayDate}
        </span>
      </div>

      {/* Set Chips */}
      <div className="flex flex-wrap gap-1.5">
        {session.sets.slice(0, 5).map((set, i) => (
          <SetChip
            key={set._id ?? i}
            set={set}
            isDurationBased={isDurationBased}
          />
        ))}
        {session.sets.length > 5 && (
          <span className="font-mono text-xs text-muted-foreground self-center">
            +{session.sets.length - 5}
          </span>
        )}
      </div>
    </div>
  );
}

interface SetChipProps {
  set: {
    reps?: number;
    weight?: number;
    duration?: number;
  };
  isDurationBased: boolean;
}

function SetChip({ set, isDurationBased }: SetChipProps) {
  let display: string;

  if (isDurationBased && set.duration !== undefined) {
    display = formatDuration(set.duration);
  } else if (set.weight !== undefined && set.weight > 0) {
    display = `${set.weight}×${set.reps}`;
  } else {
    display = `${set.reps ?? "—"}`;
  }

  return (
    <span
      className={cn(
        "inline-block px-2 py-1 rounded",
        "font-mono text-xs tabular-nums font-medium",
        "bg-concrete-gray/10 dark:bg-concrete-gray/5",
        "border border-concrete-gray/20 dark:border-concrete-gray/10",
        "text-foreground"
      )}
    >
      {display}
    </span>
  );
}

interface TrendRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function TrendRow({ icon, label, value }: TrendRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="font-mono text-xs">{label}</span>
      </div>
      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function formatBestSet(
  bestSet: NonNullable<ExerciseTrendSummary["bestSet"]>,
  unit: string
): string {
  if (bestSet.duration !== undefined) {
    return formatDuration(bestSet.duration);
  }
  if (bestSet.weight !== undefined && bestSet.reps !== undefined) {
    return `${bestSet.weight}×${bestSet.reps}`;
  }
  if (bestSet.reps !== undefined) {
    return `${bestSet.reps} reps`;
  }
  return "—";
}

export type { DetailsSectionProps };

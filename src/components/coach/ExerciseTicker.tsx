"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

/** Map primary muscle group → emoji icon */
function muscleIcon(groups: string[]): string {
  const primary = groups[0];
  switch (primary) {
    case "Chest":
      return "🏋️";
    case "Back":
      return "🔙";
    case "Shoulders":
    case "Biceps":
    case "Triceps":
      return "💪";
    case "Quads":
    case "Hamstrings":
    case "Glutes":
    case "Calves":
      return "🦵";
    case "Core":
      return "🧘";
    default:
      return "⚡";
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}sec`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m${secs}s` : `${mins}min`;
}

function getDayBounds(): { dayStartMs: number; dayEndMs: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { dayStartMs: start.getTime(), dayEndMs: end.getTime() - 1 };
}

type SummaryItem = {
  name: string;
  muscleGroups: string[];
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  totalDuration: number;
  maxWeight: number;
  unit: string | null;
};

function ExerciseChip({
  item,
  even,
}: {
  item: SummaryItem;
  even: boolean;
}) {
  const stats: string[] = [`${item.totalSets} sets`];
  if (item.totalReps > 0) stats.push(`${item.totalReps} reps`);
  if (item.maxWeight > 0)
    stats.push(`${item.maxWeight}${item.unit ?? "lbs"}`);
  if (item.totalWeight > 0)
    stats.push(`${Math.round(item.totalWeight).toLocaleString()} vol`);
  if (item.totalDuration > 0) stats.push(formatDuration(item.totalDuration));

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 ${
        even ? "bg-muted/40" : ""
      }`}
    >
      <span className="text-sm">{muscleIcon(item.muscleGroups)}</span>
      <span className="text-xs font-semibold text-foreground">
        {item.name}
      </span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {stats.join(" · ")}
      </span>
    </span>
  );
}

export function ExerciseTicker() {
  const { dayStartMs, dayEndMs } = getDayBounds();
  const summary = useQuery(api.sets.getTodayExerciseSummary, {
    dayStartMs,
    dayEndMs,
  });

  if (!summary || summary.length === 0) return null;

  const items = summary as SummaryItem[];

  // ~8s per exercise so speed feels consistent regardless of item count
  const durationSeconds = Math.max(12, items.length * 8);

  return (
    <div
      className="sticky top-0 z-30 w-full overflow-hidden border-b border-border-subtle bg-card/60 backdrop-blur-sm"
      aria-label="Today's exercise summary"
      role="marquee"
    >
      <div
        className="ticker-track flex w-max items-center"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        <div className="flex shrink-0 items-center">
          {items.map((item, idx) => (
            <ExerciseChip key={`a-${idx}`} item={item} even={idx % 2 === 0} />
          ))}
        </div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {items.map((item, idx) => (
            <ExerciseChip key={`b-${idx}`} item={item} even={idx % 2 === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

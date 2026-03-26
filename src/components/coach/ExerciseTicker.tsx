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

function formatAggregate(item: {
  totalSets: number;
  totalReps: number;
  totalWeight: number;
}): string {
  const parts: string[] = [`${item.totalSets}s`];
  if (item.totalReps > 0) parts.push(`${item.totalReps}r`);
  if (item.totalWeight > 0)
    parts.push(`${Math.round(item.totalWeight).toLocaleString()} vol`);
  return parts.join(" · ");
}

function getDayBounds(): { dayStartMs: number; dayEndMs: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { dayStartMs: start.getTime(), dayEndMs: end.getTime() - 1 };
}

export function ExerciseTicker() {
  const { dayStartMs, dayEndMs } = getDayBounds();
  const summary = useQuery(api.sets.getTodayExerciseSummary, {
    dayStartMs,
    dayEndMs,
  });

  if (!summary || summary.length === 0) return null;

  const items = summary;

  // ~8s per exercise so speed feels consistent regardless of item count
  const durationSeconds = Math.max(12, items.length * 8);

  const renderItem = (
    item: (typeof items)[number],
    idx: number,
    keyPrefix: string
  ) => (
    <span
      key={`${keyPrefix}-${idx}`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap px-3"
    >
      <span className="text-sm">{muscleIcon(item.muscleGroups)}</span>
      <span className="text-xs font-semibold text-foreground">{item.name}</span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {formatAggregate(item)}
      </span>
      <span className="ml-3 text-muted-foreground/40 select-none" aria-hidden>
        ▸
      </span>
    </span>
  );

  return (
    <div
      className="relative w-full overflow-hidden border-b border-border-subtle bg-card/60 backdrop-blur-sm"
      aria-label="Today's exercise summary"
      role="marquee"
    >
      <div
        className="ticker-track flex w-max items-center py-1.5"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        <div className="flex shrink-0 items-center">
          {items.map((item, idx) => renderItem(item, idx, "a"))}
        </div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {items.map((item, idx) => renderItem(item, idx, "b"))}
        </div>
      </div>
    </div>
  );
}

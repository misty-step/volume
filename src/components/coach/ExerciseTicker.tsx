"use client";

import { useEffect, useRef, useState } from "react";
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

function ExerciseChip({ item }: { item: SummaryItem }) {
  const stats: string[] = [`${item.totalSets} sets`];
  if (item.totalReps > 0) stats.push(`${item.totalReps} reps`);
  if (item.maxWeight > 0)
    stats.push(`${item.maxWeight}${item.unit ?? "lbs"}`);
  if (item.totalWeight > 0)
    stats.push(`${Math.round(item.totalWeight).toLocaleString()} vol`);
  if (item.totalDuration > 0) stats.push(formatDuration(item.totalDuration));

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-muted/50 px-3 py-1">
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

/** Measures whether the chip content overflows its container. */
function useOverflows(itemCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const check = () => {
      setOverflows(content.scrollWidth > container.clientWidth);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [itemCount]);

  return { containerRef, contentRef, overflows };
}

export function ExerciseTicker() {
  const { dayStartMs, dayEndMs } = getDayBounds();
  const summary = useQuery(api.sets.getTodayExerciseSummary, {
    dayStartMs,
    dayEndMs,
  });

  const items = (summary ?? []) as SummaryItem[];
  const { containerRef, contentRef, overflows } = useOverflows(items.length);

  // ~8s per exercise so speed feels consistent regardless of item count
  const durationSeconds = Math.max(12, items.length * 8);

  // Empty state
  if (summary !== undefined && items.length === 0) {
    return (
      <div className="w-full border-b border-border-subtle bg-card/60 px-4 py-2.5 backdrop-blur-sm">
        <p className="text-center text-xs text-muted-foreground">
          No exercises logged today. Start your session below.
        </p>
      </div>
    );
  }

  // Loading state
  if (summary === undefined) {
    return (
      <div className="w-full border-b border-border-subtle bg-card/60 px-4 py-2 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md justify-center gap-2">
          <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-36 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  // Static layout: chips fit within the container width
  if (!overflows) {
    return (
      <div
        ref={containerRef}
        className="w-full overflow-hidden border-b border-border-subtle bg-card/60 px-3 py-2 backdrop-blur-sm"
        aria-label="Today's exercise summary"
      >
        <div
          ref={contentRef}
          className="flex flex-wrap items-center justify-center gap-1.5"
        >
          {items.map((item, idx) => (
            <ExerciseChip key={idx} item={item} />
          ))}
        </div>
      </div>
    );
  }

  // Scrolling ticker: enough exercises to overflow
  return (
    <div
      ref={containerRef}
      className="sticky top-0 z-30 w-full overflow-hidden border-b border-border-subtle bg-card/60 backdrop-blur-sm"
      aria-label="Today's exercise summary"
      role="marquee"
    >
      <div
        className="ticker-track flex w-max items-center gap-1.5 py-2"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        <div ref={contentRef} className="flex shrink-0 items-center gap-1.5 px-1.5">
          {items.map((item, idx) => (
            <ExerciseChip key={`a-${idx}`} item={item} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 px-1.5" aria-hidden>
          {items.map((item, idx) => (
            <ExerciseChip key={`b-${idx}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

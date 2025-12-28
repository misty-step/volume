"use client";

import type { AIReportV2 } from "./types";

interface MetricsRowProps {
  volume: AIReportV2["metrics"]["volume"];
  workouts: AIReportV2["metrics"]["workouts"];
  streak: AIReportV2["metrics"]["streak"];
}

/**
 * Single metric card with big number and small label
 */
function MetricCard({
  value,
  label,
  "aria-label": ariaLabel,
}: {
  value: string;
  label: string;
  "aria-label": string;
}) {
  return (
    <div
      className="text-center p-4 bg-muted/30 border-2 border-border"
      aria-label={ariaLabel}
    >
      <div className="text-3xl font-bold font-mono">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

/**
 * Three big numbers in a row: volume, workouts, streak
 *
 * Visual priority: numbers are large, labels are subtle.
 * Accessible: each card has aria-label for screen readers.
 */
export function MetricsRow({ volume, workouts, streak }: MetricsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard
        value={volume.value}
        label={volume.unit}
        aria-label={`Total volume: ${volume.value} ${volume.unit}`}
      />
      <MetricCard
        value={workouts.value.toString()}
        label="workouts"
        aria-label={`${workouts.value} workouts`}
      />
      <MetricCard
        value={streak.value.toString()}
        label="day streak"
        aria-label={`${streak.value} day streak`}
      />
    </div>
  );
}

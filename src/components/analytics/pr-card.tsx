"use client";

import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BrutalistCard } from "@/components/brutalist/BrutalistCard";
import { Trophy } from "lucide-react";
import type { PRType } from "../../../convex/lib/pr_detection";
import {
  numberDisplayClasses,
  labelDisplayClasses,
} from "@/lib/typography-utils";

interface PRCardProps {
  prs: Array<{
    exerciseName: string;
    prType: PRType;
    currentValue: number;
    previousValue: number;
    improvement: number;
    performedAt: number;
    reps: number;
    weight?: number;
  }>;
  isLoading?: boolean;
}

/**
 * Format relative time (e.g., "2 days ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} min${minutes !== 1 ? "s" : ""} ago`;
  return "just now";
}

/**
 * Format PR improvement text
 */
function formatImprovement(
  prType: PRType,
  improvement: number,
  weight?: number
): string {
  if (prType === "weight") {
    return `+${improvement} lbs`;
  }
  if (prType === "reps") {
    return `+${improvement} reps`;
  }
  if (prType === "volume") {
    return `+${improvement} lbs total`;
  }
  return `+${improvement}`;
}

/**
 * Get badge color for PR type
 */
function getPRTypeColor(prType: PRType): string {
  if (prType === "weight")
    return "bg-danger-red/10 text-danger-red border-danger-red/50";
  if (prType === "reps")
    return "bg-safety-orange/10 text-safety-orange border-safety-orange/50";
  if (prType === "volume")
    return "bg-concrete-gray/10 text-foreground border-concrete-gray/50";
  return "bg-muted text-muted-foreground border-border";
}

export function PRCard({ prs, isLoading = false }: PRCardProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <BrutalistCard className="p-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <CardTitle className="">Recent PRs</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-4 bg-muted w-32" />
                  <div className="h-3 bg-muted w-24" />
                </div>
                <div className="h-6 bg-muted w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </BrutalistCard>
    );
  }

  // Empty state
  if (!prs || prs.length === 0) {
    return (
      <BrutalistCard className="p-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <CardTitle className="">Recent PRs</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No recent PRs - keep pushing!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Beat your personal records to see them here
            </p>
          </div>
        </CardContent>
      </BrutalistCard>
    );
  }

  return (
    <BrutalistCard className="p-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-safety-orange" />
          <CardTitle className="">Recent PRs</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {prs.slice(0, 5).map((pr, idx) => (
            <div
              key={idx}
              className="flex justify-between items-start gap-3 pb-3 border-b-3 border-concrete-gray last:border-b-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-display text-base uppercase tracking-wide truncate">
                    {pr.exerciseName}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 font-mono uppercase tracking-wide border-2 font-medium ${getPRTypeColor(pr.prType)}`}
                  >
                    {pr.prType}
                  </span>
                </div>
                <p className={labelDisplayClasses.default}>
                  {formatRelativeTime(pr.performedAt)}
                </p>
              </div>
              <div className="text-right">
                <p className={numberDisplayClasses.large}>
                  {formatImprovement(pr.prType, pr.improvement, pr.weight)}
                </p>
                <p className={labelDisplayClasses.default}>
                  {pr.currentValue}
                  {pr.prType === "weight" && " lbs"}
                  {pr.prType === "reps" && " reps"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Show count of PRs */}
        {prs.length > 5 ? (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Showing 5 of {prs.length} recent PRs
          </p>
        ) : (
          prs.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              {prs.length} personal record{prs.length !== 1 ? "s" : ""}{" "}
              achieved!
            </p>
          )
        )}
      </CardContent>
    </BrutalistCard>
  );
}

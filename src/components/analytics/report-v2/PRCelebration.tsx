"use client";

import { Trophy } from "lucide-react";
import type { AIReportV2 } from "./types";

interface PRCelebrationProps {
  pr: AIReportV2["pr"];
}

/**
 * PR Celebration Card - The "gasp moment"
 *
 * This is the visual highlight of the report when a PR exists.
 * Uses safety-orange accent color from brutalist design system.
 *
 * When no PR: shows motivational empty state message.
 */
export function PRCelebration({ pr }: PRCelebrationProps) {
  // Empty state: no PR this week
  if (!pr.hasPR) {
    return (
      <div className="text-center py-6 text-muted-foreground border-2 border-border bg-muted/20">
        <p className="text-sm">{pr.emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-safety-orange/10 border-3 border-safety-orange p-6">
      {/* Headline with icon - accessible */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy
          className="w-6 h-6 text-safety-orange flex-shrink-0"
          aria-hidden="true"
        />
        <span className="sr-only">Personal Record:</span>
        <h3 className="text-xl font-bold uppercase tracking-wide font-mono">
          {pr.headline}
        </h3>
      </div>

      {/* Big number - the star of the show */}
      <div className="text-4xl font-bold font-mono mb-2">{pr.value}</div>

      {/* Progression narrative */}
      {pr.progression && (
        <div className="text-sm text-muted-foreground mb-4 font-mono">
          {pr.progression}
        </div>
      )}

      {/* Previous + improvement */}
      {pr.previousBest && (
        <div className="text-sm mb-4">
          <span className="text-muted-foreground">Previous: </span>
          <span>{pr.previousBest}</span>
          {pr.improvement && (
            <span className="text-green-600 dark:text-green-400 ml-2 font-medium">
              ({pr.improvement})
            </span>
          )}
        </div>
      )}

      {/* AI celebration copy */}
      {pr.celebrationCopy && (
        <p className="text-sm italic mb-2">{pr.celebrationCopy}</p>
      )}

      {/* Next milestone projection */}
      {pr.nextMilestone && (
        <p className="text-sm font-medium text-safety-orange">
          {pr.nextMilestone}
        </p>
      )}
    </div>
  );
}

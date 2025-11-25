"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Target, ChevronRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { FocusSuggestion } from "../../../convex/analyticsFocus";
import Link from "next/link";

interface FocusSuggestionsWidgetProps {
  isLoading?: boolean;
}

/**
 * Get color classes for priority badges
 */
function getPriorityColor(priority: FocusSuggestion["priority"]): {
  bg: string;
  text: string;
} {
  switch (priority) {
    case "high":
      return {
        bg: "bg-red-500/10 dark:bg-red-500/20",
        text: "text-red-700 dark:text-red-300",
      };
    case "medium":
      return {
        bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
        text: "text-yellow-700 dark:text-yellow-300",
      };
    case "low":
      return {
        bg: "bg-concrete-gray/10 dark:bg-concrete-gray/20",
        text: "text-muted-foreground",
      };
  }
}

export function FocusSuggestionsWidget({
  isLoading: isLoadingProp = false,
}: FocusSuggestionsWidgetProps) {
  // Query focus suggestions data
  const suggestions = useQuery(api.analyticsFocus.getFocusSuggestions, {});

  const isLoading = isLoadingProp || suggestions === undefined;

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            <CardTitle className="">Focus Suggestions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="animate-pulse p-4 border border-2 border-border space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted w-32" />
                    <div className="h-5 bg-muted w-48 rounded" />
                    <div className="h-3 bg-muted w-40 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state (user is training everything well)
  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            <CardTitle className="">Focus Suggestions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="w-12 h-12 text-safety-orange mb-3" />
            <p className="text-sm font-medium mb-1">
              You&apos;re training everything well!
            </p>
            <p className="text-xs text-muted-foreground">
              Keep up the balanced approach
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-safety-orange" />
          <CardTitle className="">Focus Suggestions</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => {
            const colors = getPriorityColor(suggestion.priority);

            return (
              <div
                key={index}
                className="p-4 border-2 border-2 border-border transition-colors hover:border-muted-foreground/30"
              >
                {/* Priority badge and title */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 font-mono uppercase tracking-wide border-2 font-medium ${colors.bg} ${colors.text}`}
                      >
                        {suggestion.priority.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-base">
                      {suggestion.title}
                    </h3>
                  </div>
                </div>

                {/* Reason */}
                <p className="text-sm text-muted-foreground mb-3">
                  {suggestion.reason}
                </p>

                {/* Suggested exercises (for muscle_group and balance types) */}
                {suggestion.suggestedExercises &&
                  suggestion.suggestedExercises.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {suggestion.suggestedExercises.map((exercise, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-muted border-2 border-border"
                        >
                          {exercise}
                        </span>
                      ))}
                    </div>
                  )}

                {/* Action button (for exercise type with deep link) */}
                {suggestion.type === "exercise" && suggestion.exerciseId && (
                  <Link
                    href={`/log?exercise=${suggestion.exerciseId}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Log workout
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Suggestions update automatically based on your recent training
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

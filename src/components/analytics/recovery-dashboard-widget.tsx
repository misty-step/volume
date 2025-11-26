"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { RecoveryData } from "../../../convex/analyticsRecovery";

interface RecoveryDashboardWidgetProps {
  isLoading?: boolean;
}

/**
 * Get color classes for recovery status
 *
 * Color semantics:
 * - Concrete Gray: Recovering (0-2 days) - "Wait"
 * - Safety Orange: Ready (3-7 days) - "Go!"
 * - Danger Red: Overdue (8+ days) - "Urgent"
 */
function getStatusColor(
  status: RecoveryData["status"],
  isNeverTrained: boolean
): {
  bg: string;
  border: string;
  text: string;
} {
  if (isNeverTrained) {
    return {
      bg: "bg-muted/50",
      border: "border-muted",
      text: "text-muted-foreground",
    };
  }

  switch (status) {
    case "recovering":
      return {
        bg: "bg-concrete-gray/10",
        border: "border-concrete-gray/50",
        text: "text-foreground",
      };
    case "ready":
      return {
        bg: "bg-safety-orange/10",
        border: "border-safety-orange/50",
        text: "text-safety-orange",
      };
    case "overdue":
      return {
        bg: "bg-danger-red/10",
        border: "border-danger-red/50",
        text: "text-danger-red",
      };
    default:
      // Defensive fallback for unexpected values
      console.error(`[Recovery] Unexpected status: ${status}`);
      return {
        bg: "bg-muted/50",
        border: "border-muted",
        text: "text-muted-foreground",
      };
  }
}

/**
 * Format date for display (e.g., "Jan 15")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Get status label text
 */
function getStatusLabel(
  status: RecoveryData["status"],
  isNeverTrained: boolean
): string {
  if (isNeverTrained) return "Never trained";

  switch (status) {
    case "recovering":
      return "Recovering";
    case "ready":
      return "Ready";
    case "overdue":
      return "Overdue";
    default:
      return "Unknown";
  }
}

export function RecoveryDashboardWidget({
  isLoading: isLoadingProp = false,
}: RecoveryDashboardWidgetProps) {
  // Query recovery status data
  const recoveryData = useQuery(api.analyticsRecovery.getRecoveryStatus, {});

  const isLoading = isLoadingProp || recoveryData === undefined;

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            <CardTitle className="">Recovery Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse p-4 border border-2 border-border space-y-2"
              >
                <div className="h-4 bg-muted w-20" />
                <div className="h-8 bg-muted w-12" />
                <div className="h-3 bg-muted w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!recoveryData || recoveryData.length === 0) {
    return (
      <Card className="">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            <CardTitle className="">Recovery Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Log sets to see muscle group recovery
            </p>
            <p className="text-xs text-muted-foreground">
              Track rest and optimize your training schedule
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
          <Heart className="w-5 h-5 text-danger-red" />
          <CardTitle className="">Recovery Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recoveryData.map((data: RecoveryData) => {
            const isNeverTrained = data.daysSince === 999;
            const colors = getStatusColor(data.status, isNeverTrained);
            const statusLabel = getStatusLabel(data.status, isNeverTrained);

            return (
              <div
                key={data.muscleGroup}
                className={`p-4 border-2 border-2 border-border transition-colors ${colors.bg} ${colors.border}`}
              >
                {/* Muscle group name and status */}
                <div className="mb-2 space-y-1">
                  <h3 className="font-semibold text-sm">{data.muscleGroup}</h3>
                  <span
                    className={`inline-block text-xs px-2 py-0.5 font-mono uppercase tracking-wide border-2 ${colors.bg} ${colors.text} font-medium`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Days since last trained */}
                <div className="mb-2">
                  {isNeverTrained ? (
                    <div className="text-2xl font-bold tabular-nums text-muted-foreground">
                      —
                    </div>
                  ) : (
                    <div
                      className={`text-3xl font-bold tabular-nums ${colors.text}`}
                    >
                      {data.daysSince}
                      <span className="text-sm font-normal ml-1">
                        day{data.daysSince !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Last workout date */}
                <div className="text-xs text-muted-foreground mb-2">
                  {data.lastTrainedDate ? (
                    <>Last: {formatDate(data.lastTrainedDate)}</>
                  ) : (
                    <>No training history</>
                  )}
                </div>

                {/* Volume and frequency badges */}
                {!isNeverTrained && (
                  <div className="flex gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Vol:</span>
                      <span className="font-medium">
                        {data.volumeLast7Days > 0
                          ? `${(data.volumeLast7Days / 1000).toFixed(1)}k`
                          : "0"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Freq:</span>
                      <span className="font-medium">
                        {data.frequencyLast7Days}x
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer legend */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 font-mono uppercase tracking-wide border-2 border-concrete-gray bg-concrete-gray/50" />
              <span>Recovering (0-2d)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 font-mono uppercase tracking-wide border-2 border-safety-orange bg-safety-orange/50" />
              <span>Ready (3-7d)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 font-mono uppercase tracking-wide border-2 border-danger-red bg-danger-red/50" />
              <span>Overdue (8+d)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

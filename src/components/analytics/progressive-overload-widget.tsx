"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { ProgressiveOverloadData } from "../../../convex/analyticsProgressiveOverload";

interface ProgressiveOverloadWidgetProps {
  isLoading?: boolean;
}

/**
 * Get trend indicator emoji based on trend type
 */
function getTrendIndicator(
  trend: "improving" | "plateau" | "declining"
): string {
  if (trend === "improving") return "↗️";
  if (trend === "declining") return "↘️";
  return "↔️";
}

/**
 * Get trend color based on trend type
 */
function getTrendColor(trend: "improving" | "plateau" | "declining"): string {
  if (trend === "improving")
    return "text-green-600 dark:text-green-400 bg-green-500/10";
  if (trend === "declining")
    return "text-red-600 dark:text-red-400 bg-red-500/10";
  return "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10";
}

/**
 * Format date for display (e.g., "Jan 15")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProgressiveOverloadWidget({
  isLoading: isLoadingProp = false,
}: ProgressiveOverloadWidgetProps) {
  // Query progressive overload data
  const progressionData = useQuery(
    api.analyticsProgressiveOverload.getProgressiveOverloadData,
    {}
  );

  const isLoading = isLoadingProp || progressionData === undefined;

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <CardTitle className="text-lg">Progressive Overload</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted w-32 rounded" />
                <div className="h-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!progressionData || progressionData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <CardTitle className="text-lg">Progressive Overload</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Log more sets to see progression trends
            </p>
            <p className="text-xs text-muted-foreground">
              Track your strength gains over time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const repProgressionData = progressionData.filter(
    (exercise) => exercise.dataPoints.length > 0
  );

  if (repProgressionData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-lg">Progressive Overload</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground gap-2">
            <TrendingUp className="w-10 h-10 text-muted-foreground/70" />
            <p>
              Log at least one rep-based workout to unlock progression trends.
            </p>
            <p className="text-xs">
              Duration-only exercises (timed holds, cardio, etc.) aren&apos;t
              charted yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-lg">Progressive Overload</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {repProgressionData.map((exercise: ProgressiveOverloadData) => {
            // Transform data for Recharts (format dates, handle nulls)
            const chartData = exercise.dataPoints.map(
              (point: ProgressiveOverloadData["dataPoints"][0]) => ({
                date: formatDate(point.date),
                weight: point.maxWeight ?? 0,
                reps: point.maxReps,
                volume: point.volume,
              })
            );

            // Determine if exercise uses weight (not bodyweight)
            const hasWeight = exercise.dataPoints.some(
              (point: ProgressiveOverloadData["dataPoints"][0]) =>
                point.maxWeight !== null && point.maxWeight > 0
            );

            const latestPoint =
              exercise.dataPoints[exercise.dataPoints.length - 1];
            if (!latestPoint) {
              return null;
            }
            const canShowLatestWeight =
              hasWeight && latestPoint.maxWeight !== null;

            return (
              <div
                key={exercise.exerciseId}
                className="space-y-2 pb-6 border-b last:border-b-0 last:pb-0"
              >
                {/* Exercise name with trend indicator */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm truncate">
                    {exercise.exerciseName}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getTrendColor(exercise.trend)}`}
                  >
                    {getTrendIndicator(exercise.trend)} {exercise.trend}
                  </span>
                </div>

                {/* Mini Line Chart */}
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 10,
                      }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 10,
                      }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                      labelStyle={{
                        color: "hsl(var(--popover-foreground))",
                        fontWeight: "600",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "weight") {
                          return value > 0
                            ? [`${value} lbs`, "Max Weight"]
                            : null;
                        }
                        if (name === "reps") {
                          return [`${value} reps`, "Max Reps"];
                        }
                        if (name === "volume") {
                          return [`${value.toLocaleString()} lbs`, "Volume"];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "10px" }}
                      iconSize={8}
                      formatter={(value) => {
                        if (value === "weight") return "Weight";
                        if (value === "reps") return "Reps";
                        if (value === "volume") return "Volume";
                        return value;
                      }}
                    />
                    {hasWeight && (
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="reps"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Latest workout stats */}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>
                    Latest:{" "}
                    {canShowLatestWeight && (
                      <span className="font-medium text-foreground">
                        {latestPoint.maxWeight} lbs ×{" "}
                      </span>
                    )}
                    <span className="font-medium text-foreground">
                      {latestPoint.maxReps} reps
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer message */}
        {repProgressionData.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Showing top {repProgressionData.length} exercises by recent activity
          </p>
        )}
      </CardContent>
    </Card>
  );
}

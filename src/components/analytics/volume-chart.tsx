"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";

interface VolumeChartProps {
  data: Array<{
    exerciseName: string;
    totalVolume: number;
    sets: number;
  }>;
  isLoading?: boolean;
}

export function VolumeChart({ data, isLoading = false }: VolumeChartProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Volume by Exercise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Volume by Exercise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Dumbbell className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No workout data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start logging sets to see your volume
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart (use top 10 exercises)
  const chartData = data.slice(0, 10).map((item) => ({
    name: item.exerciseName,
    volume: item.totalVolume,
    sets: item.sets,
  }));

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Volume by Exercise</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
              }
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              formatter={(value: number, name: string) => {
                if (name === "volume") {
                  return [`${value.toLocaleString()} lbs`, "Total Volume"];
                }
                return [value, name];
              }}
            />
            <Bar
              dataKey="volume"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Show count of exercises */}
        {data.length > 10 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Showing top 10 of {data.length} exercises
          </p>
        )}
      </CardContent>
    </Card>
  );
}

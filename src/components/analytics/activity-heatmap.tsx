"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import ActivityCalendar, { Activity } from "react-activity-calendar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface ActivityHeatmapProps {
  data: Array<{
    date: string; // YYYY-MM-DD format
    setCount: number;
    totalVolume: number;
  }>;
  isLoading?: boolean;
}

/**
 * Calculate activity level (0-4) based on set count
 * GitHub-style intensity levels for visual consistency
 */
function calculateLevel(setCount: number): number {
  if (setCount === 0) return 0;
  if (setCount <= 3) return 1;
  if (setCount <= 7) return 2;
  if (setCount <= 12) return 3;
  return 4;
}

export function ActivityHeatmap({
  data,
  isLoading = false,
}: ActivityHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Transform data to react-activity-calendar format
  const activityData: Activity[] = useMemo(() => {
    return data.map((item) => ({
      date: item.date,
      count: item.setCount,
      level: calculateLevel(item.setCount),
    }));
  }, [data]);

  // Auto-scroll to most recent data on mount
  useEffect(() => {
    if (containerRef.current && !isLoading && data.length > 0) {
      // Scroll to far right (most recent data)
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollLeft = containerRef.current.scrollWidth;
        }
      });
    }
  }, [isLoading, data]);

  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workout Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-32 bg-concrete-gray/20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workout Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground font-mono uppercase">
              No workout data
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your activity will appear here as you log sets
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workout Frequency</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile: Allow horizontal scroll */}
        <div className="overflow-x-auto relative" ref={containerRef}>
          <ActivityCalendar
            data={activityData}
            labels={{
              totalCount: "{{count}} sets in the last year",
            }}
            showWeekdayLabels
            theme={{
              light: [
                "hsl(var(--muted))",
                "hsl(var(--primary) / 0.2)",
                "hsl(var(--primary) / 0.4)",
                "hsl(var(--primary) / 0.6)",
                "hsl(var(--primary))",
              ],
              dark: [
                "hsl(var(--muted))",
                "hsl(var(--primary) / 0.2)",
                "hsl(var(--primary) / 0.4)",
                "hsl(var(--primary) / 0.6)",
                "hsl(var(--primary))",
              ],
            }}
            blockSize={12}
            blockMargin={4}
            fontSize={12}
            renderBlock={(block, activity) => (
              <g
                onMouseEnter={(e) => {
                  const rect = (
                    e.currentTarget as SVGGElement
                  ).getBoundingClientRect();
                  setTooltip({
                    date: activity.date,
                    count: activity.count,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                {block}
              </g>
            )}
          />

          {/* Custom tooltip */}
          {tooltip && tooltip.count > 0 && (
            <div
              className="fixed z-50 px-3 py-2 bg-popover text-popover-foreground border-2 border-border shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] text-sm pointer-events-none"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y - 60}px`,
                transform: "translateX(-50%)",
              }}
            >
              <p className="font-semibold whitespace-nowrap">
                {new Date(tooltip.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {tooltip.count} set{tooltip.count !== 1 ? "s" : ""} logged
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

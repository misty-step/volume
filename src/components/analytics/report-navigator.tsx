"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { AIInsightsCard } from "./ai-insights-card";
import type { AIReport } from "./ai-insights-card";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ReportType = "daily" | "weekly" | "monthly";

/**
 * Report Navigator Component
 *
 * Provides tabbed navigation between daily, weekly, and monthly AI reports.
 * Allows users to browse all generated reports by type.
 */
export function ReportNavigator() {
  const [selectedType, setSelectedType] = useState<ReportType>("weekly");
  const [reportIndex, setReportIndex] = useState(0);

  // DEBUG: Log comprehensive user info for test report generation
  const { userId } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    if (userId && currentUser) {
      console.log("[Report Navigator Debug] User Info:", {
        clerkUserId: userId,
        convexUserId: currentUser._id,
        timezone: currentUser.timezone,
        createdAt: new Date(currentUser.createdAt).toISOString(),
      });
    }
  }, [userId, currentUser]);

  // Fetch ALL reports for navigation
  const allReports = useQuery((api as any).ai.reports.getReportHistory, {
    limit: 100,
  });

  // Filter reports by selected type
  const reportsForType =
    allReports?.filter((r: any) => r.reportType === selectedType) || [];

  // Current report to display
  const currentReport = reportsForType[reportIndex] || null;

  // Navigation state
  const hasNext = reportIndex < reportsForType.length - 1;
  const hasPrevious = reportIndex > 0;

  // Reset index when switching tabs
  useEffect(() => {
    setReportIndex(0);
  }, [selectedType]);

  // Count reports by type
  const reportCounts = {
    daily: allReports?.filter((r: any) => r.reportType === "daily").length || 0,
    weekly:
      allReports?.filter((r: any) => r.reportType === "weekly").length || 0,
    monthly:
      allReports?.filter((r: any) => r.reportType === "monthly").length || 0,
  };

  const tabs: Array<{ type: ReportType; label: string }> = [
    { type: "daily", label: "Daily" },
    { type: "weekly", label: "Weekly" },
    { type: "monthly", label: "Monthly" },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b">
        {tabs.map((tab) => {
          const count = reportCounts[tab.type];
          const isActive = selectedType === tab.type;

          return (
            <button
              key={tab.type}
              onClick={() => setSelectedType(tab.type)}
              className={`
                px-4 py-2 text-sm font-medium transition-colors
                border-b-2 -mb-px
                ${
                  isActive
                    ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                }
              `}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 text-xs opacity-60">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation Controls */}
      {reportsForType.length > 1 && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-lg">
          <button
            onClick={() => setReportIndex(reportIndex + 1)}
            disabled={!hasNext}
            className={`
              flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded transition-colors
              ${
                hasNext
                  ? "hover:bg-muted text-foreground"
                  : "opacity-40 cursor-not-allowed text-muted-foreground"
              }
            `}
            aria-label="Previous report"
          >
            <ChevronLeft className="w-4 h-4" />
            Older
          </button>

          <span className="text-sm text-muted-foreground">
            Report {reportIndex + 1} of {reportsForType.length}
          </span>

          <button
            onClick={() => setReportIndex(reportIndex - 1)}
            disabled={!hasPrevious}
            className={`
              flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded transition-colors
              ${
                hasPrevious
                  ? "hover:bg-muted text-foreground"
                  : "opacity-40 cursor-not-allowed text-muted-foreground"
              }
            `}
            aria-label="Next report"
          >
            Newer
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Report Display */}
      <AIInsightsCard report={currentReport as AIReport | null} />
    </div>
  );
}

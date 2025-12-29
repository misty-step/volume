"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { AIInsightsCard } from "../ai-insights-card";
import { MetricsRow } from "./MetricsRow";
import { PRCelebration } from "./PRCelebration";
import { ActionDirective } from "./ActionDirective";
import type { AIReportV2 } from "./types";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface AIReportCardV2Props {
  report: Doc<"aiReports">;
}

/**
 * AI Report Card V2 - Structured Visual Report
 *
 * Version-aware component that:
 * - Renders v2 structured reports with visual components
 * - Falls back to v1 markdown renderer for legacy reports
 *
 * Structure (when v2):
 * 1. Period header with date label
 * 2. Three metrics cards (volume, workouts, streak)
 * 3. PR celebration (the "gasp moment")
 * 4. Single action directive
 */
export function AIReportCardV2({ report }: AIReportCardV2Props) {
  // Version detection: v2 has structuredContent + reportVersion
  const isV2 = report.reportVersion === "2.0" && report.structuredContent;

  // Fallback to v1 markdown renderer for legacy reports
  if (!isV2) {
    return (
      <AIInsightsCard
        report={{
          _id: report._id,
          content: report.content ?? "",
          generatedAt: report.generatedAt,
          model: report.model,
          reportType: report.reportType,
          tokenUsage: report.tokenUsage,
        }}
      />
    );
  }

  // Parse structured content (already typed from schema)
  const data = report.structuredContent as AIReportV2;

  return (
    <Card>
      {/* Period Header */}
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-safety-orange" />
            <span className="text-lg font-bold font-mono">{data.period.label}</span>
          </div>
          <span className="text-xs px-2 py-1 font-bold font-mono uppercase tracking-wide bg-safety-orange text-white border-2 border-concrete-black dark:border-concrete-white">
            {data.period.type}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Section 1: Key Metrics */}
        <MetricsRow
          volume={data.metrics.volume}
          workouts={data.metrics.workouts}
          streak={data.metrics.streak}
        />

        {/* Section 2: PR Celebration */}
        <PRCelebration pr={data.pr} />

        {/* Section 3: Action Directive */}
        <ActionDirective action={data.action} />
      </CardContent>
    </Card>
  );
}

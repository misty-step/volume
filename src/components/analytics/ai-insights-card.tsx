"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";

/**
 * AI Report data structure
 */
export interface AIReport {
  _id: string;
  content: string;
  generatedAt: number;
  model: string;
  reportType?: "daily" | "weekly" | "monthly"; // Optional for backward compatibility
  tokenUsage: {
    input: number;
    output: number;
    costUSD: number;
  };
}

interface AIInsightsCardProps {
  report: AIReport | null;
}

/**
 * Get color classes for report type badge (Brutalist palette)
 */
function getReportTypeBadgeColor(
  reportType: "daily" | "weekly" | "monthly"
): string {
  switch (reportType) {
    case "daily":
      return "bg-danger-red text-white border-2 border-concrete-black dark:border-concrete-white";
    case "weekly":
      return "bg-safety-orange text-white border-2 border-concrete-black dark:border-concrete-white";
    case "monthly":
      return "bg-concrete-gray text-white border-2 border-concrete-black dark:border-concrete-white";
  }
}

/**
 * AI Coach Insights Card
 *
 * Displays AI-generated workout analysis with markdown rendering.
 * Reports are generated automatically by scheduled cron jobs.
 *
 * @param report - AI report data (null if no report exists yet)
 */
export function AIInsightsCard({ report }: AIInsightsCardProps) {
  // Empty state: No report yet (waiting for automated generation)
  if (!report) {
    return (
      <Card className="">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-safety-orange" />
            <CardTitle className="">AI Coach Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <Sparkles className="w-12 h-12 text-safety-orange mb-3" />
            <p className="text-sm font-medium mb-2">No reports available yet</p>
            <p className="text-xs text-muted-foreground max-w-md mb-4">
              AI reports analyze your workout data to provide technical insights
              on volume, progress, and recovery patterns.
            </p>
            <div className="bg-muted/50 border-2 border-border p-4 text-left max-w-md">
              <p className="text-xs font-medium mb-2">Reports generate when:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>You have logged workout data for the period</li>
                <li>Automated cron jobs run (daily/weekly/monthly)</li>
                <li>Or you manually generate a report (coming soon)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state: Display report

  const timeAgo = formatDistanceToNow(new Date(report.generatedAt), {
    addSuffix: true,
  });

  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-safety-orange" />
          <CardTitle className="">AI Coach Insights</CardTitle>
          {report.reportType && (
            <span
              className={`text-xs px-2 py-0.5 font-bold font-mono uppercase tracking-wide ${getReportTypeBadgeColor(report.reportType)}`}
            >
              {report.reportType}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Generated {timeAgo}</p>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              // Style headers with better spacing
              h1: ({ children }) => (
                <h2 className="text-lg font-bold mt-6 mb-3 first:mt-0 pb-2 border-b border-border">
                  {children}
                </h2>
              ),
              h2: ({ children }) => (
                <h3 className="text-base font-semibold mt-5 mb-2">
                  {children}
                </h3>
              ),
              h3: ({ children }) => (
                <h4 className="text-sm font-semibold mt-3 mb-1.5">
                  {children}
                </h4>
              ),
              // Style paragraphs with better readability
              p: ({ children }) => (
                <p className="text-sm leading-relaxed mb-4 text-muted-foreground">
                  {children}
                </p>
              ),
              // Style unordered lists
              ul: ({ children }) => (
                <ul className="list-disc list-outside pl-5 space-y-2 mb-4">
                  {children}
                </ul>
              ),
              // Style ordered lists (for numbered recommendations)
              ol: ({ children }) => (
                <ol className="list-decimal list-outside pl-5 space-y-2 mb-4">
                  {children}
                </ol>
              ),
              // List items with better spacing
              li: ({ children }) => (
                <li className="text-sm leading-relaxed pl-1">{children}</li>
              ),
              // Style strong text with accent color
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">
                  {children}
                </strong>
              ),
              // Style emphasis
              em: ({ children }) => (
                <em className="italic text-muted-foreground">{children}</em>
              ),
              // Style inline code
              code: ({ children }) => (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
                  {children}
                </code>
              ),
              // Style horizontal rules as section dividers
              hr: () => <hr className="my-6 border-border" />,
              // Style blockquotes (if AI uses them)
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-purple-500/30 pl-4 my-4 italic text-muted-foreground">
                  {children}
                </blockquote>
              ),
            }}
          >
            {report.content}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}

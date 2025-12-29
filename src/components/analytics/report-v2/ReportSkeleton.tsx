"use client";

/**
 * Loading Skeleton for V2 Reports
 *
 * Fixed heights prevent layout shift during loading.
 * Matches the structure of AIReportCardV2.
 */
export function ReportSkeleton() {
  return (
    <div className="border-3 border-border bg-card animate-pulse">
      {/* Header skeleton */}
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metrics row skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-muted/30 border-2 border-border">
              <div className="h-8 w-16 bg-muted rounded mx-auto mb-2" />
              <div className="h-3 w-12 bg-muted rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* PR section skeleton */}
        <div className="p-6 bg-muted/20 border-3 border-muted">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 bg-muted rounded" />
            <div className="h-6 w-48 bg-muted rounded" />
          </div>
          <div className="h-10 w-24 bg-muted rounded mb-4" />
          <div className="h-4 w-64 bg-muted rounded mb-2" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>

        {/* Action skeleton */}
        <div className="flex items-start gap-3 p-4 bg-muted/30 border-2 border-border">
          <div className="h-5 w-5 bg-muted rounded-full" />
          <div className="flex-1">
            <div className="h-5 w-64 bg-muted rounded mb-2" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

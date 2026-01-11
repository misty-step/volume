"use client";

import { CheckCircle } from "lucide-react";
import type { AIReportV2 } from "./types";

interface ActionDirectiveProps {
  action: AIReportV2["action"];
}

/**
 * Single Action Directive with Rationale
 *
 * ONE clear action - no list, no hedging.
 * Coaching tone: "Do this." + "Here's why."
 */
export function ActionDirective({ action }: ActionDirectiveProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-muted/30 border-2 border-border">
      <CheckCircle
        className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
        aria-hidden="true"
      />
      <div>
        <p className="font-medium">{action.directive}</p>
        <p className="text-sm text-muted-foreground mt-1">{action.rationale}</p>
      </div>
    </div>
  );
}

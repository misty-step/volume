"use client";

import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/date-utils";
import type { CoachBlock } from "@/lib/coach/schema";

function statusToneClasses(tone: "success" | "error" | "info"): string {
  if (tone === "success") return "border-l-4 border-l-green-500";
  if (tone === "error") return "border-l-4 border-l-danger-red";
  return "border-l-4 border-l-safety-orange";
}

function formatMetricTotal(metric: "reps" | "duration", value: number): string {
  if (metric === "reps") return `${value} reps`;
  if (value < 60) return `${value} sec`;
  if (value % 60 === 0) return `${value / 60} min`;
  return formatDuration(value);
}

function renderTrendBars(
  points: Array<{ date: string; label: string; value: number }>,
  bestDay: number
) {
  const safeBest = Math.max(bestDay, 1);
  return (
    <div className="mt-3">
      <div className="h-28 flex items-end gap-1">
        {points.map((point) => {
          const height = Math.max(
            (point.value / safeBest) * 100,
            point.value > 0 ? 8 : 4
          );
          return (
            <div
              key={point.date}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-sm bg-safety-orange/80 transition-[height] duration-200"
                style={{ height: `${height}%` }}
                title={`${point.label}: ${point.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-mono uppercase">
        <span>{points[0]?.label ?? ""}</span>
        <span>{points[points.length - 1]?.label ?? ""}</span>
      </div>
    </div>
  );
}

export function CoachBlockRenderer({
  block,
  onPrompt,
  onUndo,
}: {
  block: CoachBlock;
  onPrompt: (prompt: string) => void;
  onUndo?: (actionId: string, turnId: string) => void;
}) {
  if (block.type === "client_action") {
    return null;
  }

  if (block.type === "undo") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{block.title ?? "Undo"}</CardTitle>
          {block.description ? (
            <p className="text-xs text-muted-foreground">{block.description}</p>
          ) : null}
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUndo?.(block.actionId, block.turnId)}
            disabled={!onUndo}
          >
            Undo
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (block.type === "status") {
    return (
      <div
        className={`rounded-md border bg-background px-3 py-2 ${statusToneClasses(block.tone)}`}
      >
        <p className="text-sm font-semibold">{block.title}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {block.description}
        </p>
      </div>
    );
  }

  if (block.type === "metrics") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{block.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {block.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded border bg-muted/30 px-3 py-2"
              >
                <p className="text-[10px] uppercase font-mono text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-sm font-semibold mt-1">{metric.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (block.type === "trend") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-safety-orange" />
            {block.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{block.subtitle}</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">14-day total</span>
            <span className="font-semibold">
              {formatMetricTotal(block.metric, block.total)}
            </span>
          </div>
          {renderTrendBars(block.points, block.bestDay)}
        </CardContent>
      </Card>
    );
  }

  if (block.type === "table") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{block.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {block.rows.map((row, idx) => (
            <div
              key={`${row.label}-${row.value}-${idx}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div>
                <p className="font-medium">{row.label}</p>
                {row.meta ? (
                  <p className="text-xs text-muted-foreground">{row.meta}</p>
                ) : null}
              </div>
              <p className="font-semibold text-right">{row.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {block.prompts.map((prompt) => (
        <Button
          key={prompt}
          size="sm"
          variant="outline"
          onClick={() => onPrompt(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}

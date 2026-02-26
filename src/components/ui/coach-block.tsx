"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
  CounterClockwiseClockIcon,
  BarChartIcon,
  LightningBoltIcon,
  ExclamationTriangleIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { dt } from "@/lib/design-tokens";
import type { CoachBlock } from "@/lib/coach/schema";
import { formatDuration } from "@/lib/date-utils";

// ─── Shared primitives ───────────────────────────────────────────────────────

const Block = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) => (
  <section
    className={cn(
      "rounded-[--radius] border border-border-subtle bg-card w-full p-[10px]",
      className
    )}
    {...props}
  >
    {children}
  </section>
);

const BlockTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <p className={cn(dt.sectionTitle, className)}>{children}</p>;

const BlockMuted = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <p className={cn(dt.mutedText, className)}>{children}</p>;

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className={dt.eyebrowClass}>{children}</p>
);

const ChipButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex min-h-[44px] items-center rounded-[--radius] border border-border bg-card/35 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:scale-[0.98]"
  >
    {children}
  </button>
);

const ActionButton = ({
  children,
  onClick,
  variant = "ghost",
  className,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) => {
  const base =
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[--radius] px-3 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-accent text-accent-foreground hover:bg-accent/90",
    ghost: "border border-border bg-transparent text-foreground hover:bg-card",
    danger:
      "border border-destructive/55 bg-destructive/16 text-foreground hover:bg-destructive/24",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, variants[variant], className)}
    >
      {children}
    </button>
  );
};

// ─── Status ──────────────────────────────────────────────────────────────────

type StatusTone = "success" | "error" | "info";

function statusToneClasses(tone: StatusTone): string {
  if (tone === "success") return "border-success/50 bg-success-bg/80";
  if (tone === "error") return "border-destructive/50 bg-destructive/10";
  return "border-accent/45 bg-accent/14";
}

function StatusIcon({ tone }: { tone: StatusTone }) {
  if (tone === "success")
    return <CheckCircledIcon className="h-4 w-4 shrink-0 text-success" />;
  if (tone === "error")
    return <CrossCircledIcon className="h-4 w-4 shrink-0 text-destructive" />;
  return <InfoCircledIcon className="h-4 w-4 shrink-0 text-accent" />;
}

export function StatusBlock({
  tone,
  title,
  description,
}: {
  tone: StatusTone;
  title: string;
  description?: string;
}) {
  return (
    <section
      className={cn(
        "flex items-start gap-2 rounded-[--radius] border px-3 py-2",
        statusToneClasses(tone)
      )}
    >
      <StatusIcon tone={tone} />
      <div className="min-w-0">
        <BlockTitle>{title}</BlockTitle>
        {description ? (
          <BlockMuted className="mt-1">{description}</BlockMuted>
        ) : null}
      </div>
    </section>
  );
}

// ─── Undo ────────────────────────────────────────────────────────────────────

export function UndoBlock({
  title,
  description,
  actionId,
  turnId,
  onUndo,
}: {
  title?: string;
  description?: string;
  actionId: string;
  turnId: string;
  onUndo?: (actionId: string, turnId: string) => void;
}) {
  return (
    <Block className="space-y-3">
      <div>
        <BlockTitle>{title ?? "Undo"}</BlockTitle>
        {description ? (
          <BlockMuted className="mt-1">{description}</BlockMuted>
        ) : null}
      </div>
      <ActionButton
        variant="ghost"
        className="w-full"
        onClick={() => onUndo?.(actionId, turnId)}
        disabled={!onUndo}
      >
        <CounterClockwiseClockIcon className="h-4 w-4" />
        Undo
      </ActionButton>
    </Block>
  );
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export function MetricsBlock({
  title,
  metrics,
}: {
  title: string;
  metrics: Array<{ label: string; value: string; unit?: string }>;
}) {
  return (
    <Block className="space-y-3">
      <header className="flex items-center gap-2">
        <BarChartIcon className="h-4 w-4 text-accent" />
        <BlockTitle>{title}</BlockTitle>
      </header>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[calc(var(--radius)-2px)] border border-border-subtle bg-card-elevated p-[8px]"
          >
            <Eyebrow>{metric.label}</Eyebrow>
            <p className="mt-1">
              <span className={dt.metric.val}>{metric.value}</span>
              {metric.unit ? (
                <span className={dt.metric.unit}> {metric.unit}</span>
              ) : null}
            </p>
          </div>
        ))}
      </div>
    </Block>
  );
}

// ─── Trend ───────────────────────────────────────────────────────────────────

function formatMetricTotal(metric: "reps" | "duration", value: number): string {
  if (metric === "reps") return `${value} reps`;
  if (value < 60) return `${value} sec`;
  if (value % 60 === 0) return `${value / 60} min`;
  return formatDuration(value);
}

export function TrendBlock({
  title,
  subtitle,
  points,
  bestDay,
  total,
  metric,
}: {
  title: string;
  subtitle?: string;
  points: Array<{ date: string; label: string; value: number }>;
  bestDay: number;
  total: number;
  metric: "reps" | "duration";
}) {
  const safeBest = Math.max(bestDay, 1);
  // 3 date labels: first, middle, last
  const firstLabel = points[0]?.label ?? "";
  const midLabel = points[Math.floor(points.length / 2)]?.label ?? "";
  const lastLabel = points[points.length - 1]?.label ?? "";

  return (
    <Block className="space-y-3">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <RocketIcon className="h-4 w-4 text-accent" />
          <BlockTitle>{title}</BlockTitle>
        </div>
        {subtitle ? <BlockMuted>{subtitle}</BlockMuted> : null}
      </header>
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>14-day total</span>
        <span className="font-semibold text-foreground">
          {formatMetricTotal(metric, total)}
        </span>
      </div>
      {/* SVG bar chart */}
      <div className="mt-1">
        <svg
          viewBox="0 0 280 80"
          className="w-full"
          aria-label={`${title} trend chart`}
        >
          {points.map((point, i) => {
            const barWidth = 14;
            const gap = 6;
            const x = i * (barWidth + gap);
            const maxH = 60;
            const h = Math.max(
              (point.value / safeBest) * maxH,
              point.value > 0 ? 6 : 3
            );
            const y = 70 - h;
            const isMax = point.value === bestDay;
            return (
              <rect
                key={point.date}
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx="3"
                fill={
                  isMax ? "hsl(var(--accent))" : "hsl(var(--accent) / 0.35)"
                }
              />
            );
          })}
        </svg>
        <div className="mt-1 flex justify-between text-[10px] uppercase text-muted-foreground">
          <span>{firstLabel}</span>
          <span>{midLabel}</span>
          <span>{lastLabel}</span>
        </div>
      </div>
    </Block>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

export function TableBlock({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string; meta?: string }>;
}) {
  return (
    <Block>
      <header className="pb-2">
        <BlockTitle>{title}</BlockTitle>
      </header>
      <div className="divide-y divide-border-subtle space-y-0">
        {rows.map((row, idx) => (
          <div
            key={`${row.label}-${row.value}-${idx}`}
            className="flex items-start justify-between gap-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{row.label}</p>
              {row.meta ? (
                <BlockMuted className="mt-0.5">{row.meta}</BlockMuted>
              ) : null}
            </div>
            <p className="text-right font-semibold text-foreground">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </Block>
  );
}

// ─── Entity List ─────────────────────────────────────────────────────────────

export function EntityListBlock({
  title,
  description,
  items,
  emptyLabel,
  onPrompt,
}: {
  title: string;
  description?: string;
  items: Array<{
    id?: string;
    title: string;
    subtitle?: string;
    meta?: string;
    tags?: string[];
    prompt?: string;
  }>;
  emptyLabel?: string;
  onPrompt: (prompt: string) => void;
}) {
  return (
    <Block>
      <header className="space-y-1 pb-2">
        <BlockTitle>{title}</BlockTitle>
        {description ? <BlockMuted>{description}</BlockMuted> : null}
      </header>
      {items.length === 0 ? (
        <BlockMuted>{emptyLabel ?? "No items yet."}</BlockMuted>
      ) : (
        <div className="divide-y divide-border-subtle">
          {items.map((item, idx) => (
            <div key={`${item.id ?? item.title}-${idx}`} className="py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  {item.subtitle ? (
                    <BlockMuted className="mt-1">{item.subtitle}</BlockMuted>
                  ) : null}
                  {item.meta ? (
                    <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                      {item.meta}
                    </p>
                  ) : null}
                </div>
                {item.prompt ? (
                  <ActionButton
                    variant="ghost"
                    className="min-h-9 px-3 text-xs"
                    onClick={() => onPrompt(item.prompt as string)}
                  >
                    Open
                  </ActionButton>
                ) : null}
              </div>
              {item.tags && item.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-[calc(var(--radius)-4px)] border border-border-subtle px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Block>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

export function DetailPanelBlock({
  title,
  description,
  fields,
  prompts,
  onPrompt,
}: {
  title: string;
  description?: string;
  fields: Array<{ label: string; value: string; emphasis?: boolean }>;
  prompts?: string[];
  onPrompt: (prompt: string) => void;
}) {
  return (
    <Block>
      <header className="space-y-1 pb-2">
        <BlockTitle>{title}</BlockTitle>
        {description ? <BlockMuted>{description}</BlockMuted> : null}
      </header>
      <div className="space-y-2">
        {fields.map((field, idx) => (
          <div
            key={`${field.label}-${idx}`}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <span className="text-muted-foreground">{field.label}</span>
            <span
              className={cn(
                "text-right text-foreground",
                field.emphasis ? "font-semibold" : "font-normal"
              )}
            >
              {field.value}
            </span>
          </div>
        ))}
      </div>
      {prompts && prompts.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <ChipButton key={prompt} onClick={() => onPrompt(prompt)}>
              {prompt}
            </ChipButton>
          ))}
        </div>
      ) : null}
    </Block>
  );
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

export function SuggestionsBlock({
  prompts,
  onPrompt,
}: {
  prompts: string[];
  onPrompt: (prompt: string) => void;
}) {
  const limited = prompts.slice(0, 3);
  return (
    <Block className="space-y-2">
      <header>
        <BlockTitle>Suggested</BlockTitle>
      </header>
      <div className="grid grid-cols-1 gap-2">
        {limited.map((prompt) => (
          <ActionButton
            key={prompt}
            variant="ghost"
            className="w-full justify-start px-3 text-left"
            onClick={() => onPrompt(prompt)}
          >
            {prompt}
          </ActionButton>
        ))}
      </div>
    </Block>
  );
}

// ─── Billing Panel ───────────────────────────────────────────────────────────

export function BillingPanelBlock({
  block,
  onClientAction,
}: {
  block: Extract<CoachBlock, { type: "billing_panel" }>;
  onClientAction?: (action: "open_checkout" | "open_billing_portal") => void;
}) {
  const action =
    block.ctaAction === "open_portal" ? "open_billing_portal" : "open_checkout";
  return (
    <Block className="space-y-3">
      <header className="space-y-1">
        <BlockTitle>{block.title}</BlockTitle>
        {block.subtitle ? <BlockMuted>{block.subtitle}</BlockMuted> : null}
      </header>
      <div className="rounded-[calc(var(--radius)-2px)] border border-border-subtle bg-card-elevated px-3 py-2 space-y-1">
        <Eyebrow>Status</Eyebrow>
        <p className="text-sm font-semibold text-foreground">{block.status}</p>
        {block.trialDaysRemaining !== undefined ? (
          <BlockMuted>Trial days left: {block.trialDaysRemaining}</BlockMuted>
        ) : null}
        {block.periodEnd ? (
          <BlockMuted>Period end: {block.periodEnd}</BlockMuted>
        ) : null}
      </div>
      {block.ctaLabel && block.ctaAction ? (
        <ActionButton
          variant="primary"
          className="w-full"
          onClick={() => onClientAction?.(action)}
        >
          <LightningBoltIcon className="h-4 w-4" />
          {block.ctaLabel}
        </ActionButton>
      ) : null}
    </Block>
  );
}

// ─── Confirmation ─────────────────────────────────────────────────────────────

export function ConfirmationBlock({
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmPrompt,
  cancelPrompt,
  onPrompt,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmPrompt: string;
  cancelPrompt?: string;
  onPrompt: (prompt: string) => void;
}) {
  return (
    <Block className="space-y-3">
      <header className="space-y-1">
        <BlockTitle>{title}</BlockTitle>
        {description ? <BlockMuted>{description}</BlockMuted> : null}
      </header>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ActionButton
          variant="danger"
          className="w-full"
          onClick={() => onPrompt(confirmPrompt)}
        >
          <ExclamationTriangleIcon className="h-4 w-4" />
          {confirmLabel ?? "Confirm"}
        </ActionButton>
        {cancelPrompt ? (
          <ActionButton
            variant="ghost"
            className="w-full"
            onClick={() => onPrompt(cancelPrompt)}
          >
            {cancelLabel ?? "Cancel"}
          </ActionButton>
        ) : null}
      </div>
    </Block>
  );
}

// ─── Quick Log Form ───────────────────────────────────────────────────────────

const fieldLabel =
  "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground";
const fieldHint = "text-[11px] text-muted-foreground";
const fieldError = "text-xs text-destructive";
const inputBase =
  "h-11 w-full rounded-[--radius] border border-input bg-background/76 px-3 text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm";

export function QuickLogFormBlock({
  block,
  onPrompt,
}: {
  block: Extract<CoachBlock, { type: "quick_log_form" }>;
  onPrompt: (prompt: string) => void;
}) {
  const [exercise, setExercise] = useState(block.exerciseName ?? "");
  const [reps, setReps] = useState("");
  const [duration, setDuration] = useState("");
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"lbs" | "kg">(block.defaultUnit ?? "lbs");
  const [error, setError] = useState<string | null>(null);

  const hasCoreValue = useMemo(
    () => reps.trim().length > 0 || duration.trim().length > 0,
    [duration, reps]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const exerciseName = exercise.trim();
    const repsValue = reps.trim();
    const durationValue = duration.trim();
    const weightValue = weight.trim();

    if (!exerciseName) {
      setError("Enter an exercise name before logging.");
      return;
    }
    if (!hasCoreValue) {
      setError("Add reps or duration to log this set.");
      return;
    }
    if (repsValue.length > 0 && durationValue.length > 0) {
      setError("Use reps or duration, not both, for one quick log.");
      return;
    }
    if (repsValue.length > 0 && !/^\d+$/.test(repsValue)) {
      setError("Reps must be a whole number.");
      return;
    }
    if (durationValue.length > 0 && !/^\d+$/.test(durationValue)) {
      setError("Duration must be in seconds.");
      return;
    }
    if (weightValue.length > 0 && !/^\d+(\.\d+)?$/.test(weightValue)) {
      setError("Weight must be numeric.");
      return;
    }

    setError(null);
    const setCore =
      durationValue.length > 0
        ? `${durationValue} sec ${exerciseName}`
        : `${repsValue} ${exerciseName}`;
    const withWeight =
      weightValue.length > 0 ? `${setCore} @ ${weightValue} ${unit}` : setCore;
    onPrompt(withWeight);
  }

  return (
    <Block className="space-y-3">
      <header>
        <BlockTitle>{block.title}</BlockTitle>
      </header>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className={fieldLabel} htmlFor="quick-log-exercise">
            Exercise
          </label>
          <input
            id="quick-log-exercise"
            value={exercise}
            onChange={(e) => {
              setExercise(e.target.value);
              setError(null);
            }}
            placeholder="Exercise name"
            className={inputBase}
          />
          <p className={fieldHint}>
            Use the exact exercise label you want in history.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={fieldLabel} htmlFor="quick-log-reps">
              Reps
            </label>
            <input
              id="quick-log-reps"
              value={reps}
              onChange={(e) => {
                setReps(e.target.value);
                setError(null);
              }}
              placeholder="Reps"
              inputMode="numeric"
              className={inputBase}
            />
          </div>
          <div className="space-y-1">
            <label className={fieldLabel} htmlFor="quick-log-duration">
              Duration
            </label>
            <input
              id="quick-log-duration"
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value);
                setError(null);
              }}
              placeholder="Duration sec"
              inputMode="numeric"
              className={inputBase}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={fieldLabel} htmlFor="quick-log-weight">
              Weight
            </label>
            <input
              id="quick-log-weight"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                setError(null);
              }}
              placeholder={`Weight (${unit})`}
              inputMode="decimal"
              className={inputBase}
            />
          </div>
          <div className="space-y-1">
            <label className={fieldLabel} htmlFor="quick-log-unit">
              Unit
            </label>
            <select
              id="quick-log-unit"
              className={inputBase}
              value={unit}
              onChange={(e) => setUnit(e.target.value === "kg" ? "kg" : "lbs")}
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
        {error ? (
          <p className={fieldError}>{error}</p>
        ) : (
          <p className={fieldHint}>
            Tip: quick log also accepts prompts like &quot;12 pushups&quot;.
          </p>
        )}
        <ActionButton type="submit" variant="primary" className="w-full">
          Log Set
        </ActionButton>
      </form>
    </Block>
  );
}

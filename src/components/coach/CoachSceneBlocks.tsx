"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { useActions, useBoundProp } from "@json-render/react";
import {
  BarChartIcon,
  CheckCircledIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightningBoltIcon,
  RocketIcon,
  RowSpacingIcon,
} from "@radix-ui/react-icons";
import { formatDuration } from "@/lib/date-utils";
import { dt } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  MetricsBlock,
  StatusBlock,
  TableBlock,
  TrendBlock,
  UndoBlock,
} from "@/components/ui/coach-block";

type TrendMetric = "reps" | "duration";

type ExerciseRow = {
  name: string;
  sets: number;
  reps?: number;
  durationSeconds?: number;
};

type TableRow = {
  label: string;
  value: string;
  meta?: string;
};

type ComponentBindings = Record<string, string> | undefined;

const quickLogFieldLabel =
  "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground";
const quickLogFieldHint = "text-[11px] text-muted-foreground";
const quickLogFieldError = "text-xs text-destructive";
const quickLogInputBase =
  "h-11 w-full rounded-[--radius] border border-input bg-background/76 px-3 text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm";

function useControlledString(
  initialValue: string | null | undefined,
  bindingPath?: string
) {
  const normalized = initialValue ?? "";
  const [boundValue, setBoundValue] = useBoundProp<string>(
    normalized,
    bindingPath
  );
  const [localValue, setLocalValue] = useState(() => normalized);

  return [
    bindingPath ? (boundValue ?? "") : localValue,
    (nextValue: string) => {
      if (bindingPath) {
        setBoundValue(nextValue);
        return;
      }
      setLocalValue(nextValue);
    },
  ] as const;
}

function useControlledUnit(
  initialValue: "lbs" | "kg" | null | undefined,
  bindingPath?: string
) {
  const normalized = initialValue === "kg" ? "kg" : "lbs";
  const [boundValue, setBoundValue] = useBoundProp<"lbs" | "kg">(
    normalized,
    bindingPath
  );
  const [localValue, setLocalValue] = useState<"lbs" | "kg">(() => normalized);

  return [
    bindingPath ? (boundValue === "kg" ? "kg" : "lbs") : localValue,
    (nextValue: "lbs" | "kg") => {
      if (bindingPath) {
        setBoundValue(nextValue);
        return;
      }
      setLocalValue(nextValue);
    },
  ] as const;
}

const Card = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <section
    className={cn(
      "w-full rounded-[--radius] border border-border-subtle bg-card p-[10px]",
      className
    )}
  >
    {children}
  </section>
);

const Title = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <p className={cn(dt.sectionTitle, className)}>{children}</p>;

const Muted = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <p className={cn(dt.mutedText, className)}>{children}</p>;

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className={dt.eyebrowClass}>{children}</p>
);

const ActionSurface = ({
  children,
  onPress,
  className,
}: {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onPress}
    className={cn(
      "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[--radius] border border-border bg-card/35 px-3 text-sm font-medium text-foreground transition-colors hover:bg-card active:scale-[0.98]",
      className
    )}
  >
    {children}
  </button>
);

function formatExerciseMeta(exercise: ExerciseRow): string | undefined {
  if (exercise.reps && exercise.reps > 0) {
    return `${exercise.reps} reps`;
  }
  if (exercise.durationSeconds && exercise.durationSeconds > 0) {
    return formatDuration(exercise.durationSeconds);
  }
  return undefined;
}

function toneLabel(tone: "success" | "error" | "info") {
  if (tone === "success") return "Ready";
  if (tone === "error") return "Needs attention";
  return "Update";
}

function toneBadgeClasses(tone: "success" | "error" | "info") {
  if (tone === "success") {
    return "border-success/45 bg-success-bg/80 text-success";
  }
  if (tone === "error") {
    return "border-destructive/45 bg-destructive/10 text-destructive";
  }
  return "border-accent/45 bg-accent/12 text-accent";
}

function TrendSummary({
  exerciseName,
  takeaway,
}: {
  exerciseName: string;
  takeaway?: string;
}) {
  if (!takeaway) return null;
  return (
    <Card className="space-y-1 border-accent/35 bg-accent/8">
      <div className="flex items-center gap-2">
        <RocketIcon className="h-4 w-4 text-accent" />
        <Title>{exerciseName}</Title>
      </div>
      <Muted>{takeaway}</Muted>
    </Card>
  );
}

export function SceneFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="space-y-1 px-1">
        <Title className="text-base">{title}</Title>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function ActionTray({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function ActionChip({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <ActionSurface
      onPress={onPress}
      className="px-3 text-xs text-muted-foreground"
    >
      {label}
    </ActionSurface>
  );
}

export function ChoiceCard({
  title,
  description,
  meta,
  tags,
  onPress,
}: {
  title: string;
  description?: string;
  meta?: string;
  tags?: string[];
  onPress?: () => void;
}) {
  return (
    <ActionSurface
      onPress={onPress}
      className="w-full items-start justify-between px-3 py-3 text-left"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <Title>{title}</Title>
        {description ? <Muted>{description}</Muted> : null}
        {meta ? (
          <p className="text-[11px] font-mono text-muted-foreground">{meta}</p>
        ) : null}
        {tags && tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
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
      <RowSpacingIcon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </ActionSurface>
  );
}

export function DailySnapshotScene({
  title,
  subtitle,
  totalSets,
  totalReps,
  totalDurationSeconds,
  exerciseCount,
  topExercises,
}: {
  title: string;
  subtitle?: string;
  totalSets: number;
  totalReps: number;
  totalDurationSeconds: number;
  exerciseCount: number;
  topExercises: ExerciseRow[];
}) {
  return (
    <div className="space-y-3">
      <MetricsBlock
        title={title}
        metrics={[
          { label: "Sets", value: String(totalSets) },
          { label: "Reps", value: String(totalReps) },
          {
            label: "Duration",
            value:
              totalDurationSeconds > 0
                ? formatDuration(totalDurationSeconds)
                : "0 sec",
          },
          { label: "Exercises", value: String(exerciseCount) },
        ]}
      />
      {subtitle ? (
        <Card className="space-y-1 border-accent/30 bg-accent/8 px-3 py-2">
          <Eyebrow>Takeaway</Eyebrow>
          <Muted>{subtitle}</Muted>
        </Card>
      ) : null}
      <TableBlock
        title="Top exercises"
        rows={topExercises.map((exercise) => ({
          label: exercise.name,
          value: `${exercise.sets} sets`,
          meta: formatExerciseMeta(exercise),
        }))}
      />
    </div>
  );
}

export function AnalyticsOverviewScene({
  currentStreak,
  longestStreak,
  workoutDays,
  recentVolume,
  recentPrs,
  overload,
  focusSuggestions,
}: {
  currentStreak: number;
  longestStreak: number;
  workoutDays: number;
  recentVolume: number;
  recentPrs: Array<{ exerciseName: string; prLabel: string; detail?: string }>;
  overload: Array<{ exerciseName: string; trend: string; note?: string }>;
  focusSuggestions: Array<{ title: string; priority: string; reason: string }>;
}) {
  return (
    <div className="space-y-3">
      <MetricsBlock
        title="Analytics overview"
        metrics={[
          { label: "Current streak", value: String(currentStreak) },
          { label: "Longest streak", value: String(longestStreak) },
          { label: "Workout days", value: String(workoutDays) },
          { label: "14d volume", value: String(recentVolume) },
        ]}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <TableBlock
          title="Recent PRs"
          rows={recentPrs.map((entry) => ({
            label: entry.exerciseName,
            value: entry.prLabel,
            meta: entry.detail,
          }))}
        />
        <TableBlock
          title="Progressive overload"
          rows={overload.map((entry) => ({
            label: entry.exerciseName,
            value: entry.trend,
            meta: entry.note,
          }))}
        />
      </div>
      <TableBlock
        title="Focus suggestions"
        rows={focusSuggestions.map((entry) => ({
          label: entry.title,
          value: entry.priority.toUpperCase(),
          meta: entry.reason,
        }))}
      />
    </div>
  );
}

export function ExerciseInsightScene({
  exerciseName,
  takeaway,
  summaryMetrics,
  trend,
  recentRows,
}: {
  exerciseName: string;
  takeaway?: string;
  summaryMetrics: Array<{ label: string; value: string }>;
  trend?: {
    subtitle?: string;
    metric: TrendMetric;
    total: number;
    bestDay: number;
    points: Array<{ date: string; label: string; value: number }>;
  };
  recentRows?: TableRow[];
}) {
  return (
    <div className="space-y-3">
      <TrendSummary exerciseName={exerciseName} takeaway={takeaway} />
      <MetricsBlock
        title={`${exerciseName} snapshot`}
        metrics={summaryMetrics}
      />
      {trend ? (
        <TrendBlock
          title={`${exerciseName} trend`}
          subtitle={trend.subtitle}
          points={trend.points}
          bestDay={trend.bestDay}
          total={trend.total}
          metric={trend.metric}
        />
      ) : null}
      {recentRows && recentRows.length > 0 ? (
        <TableBlock title="Recent sets" rows={recentRows} />
      ) : null}
    </div>
  );
}

export function HistoryTimelineScene({
  sessions,
}: {
  sessions: Array<{
    dateLabel: string;
    summary?: string;
    rows: TableRow[];
  }>;
}) {
  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card key={session.dateLabel} className="space-y-3">
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-accent" />
              <Title>{session.dateLabel}</Title>
            </div>
            {session.summary ? <Muted>{session.summary}</Muted> : null}
          </header>
          <TableBlock title="Session detail" rows={session.rows} />
        </Card>
      ))}
    </div>
  );
}

export function LibraryScene({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: Array<{
    name: string;
    status: string;
    muscleGroups?: string[];
    lastLogged?: string;
    note?: string;
  }>;
}) {
  return (
    <Card className="space-y-3">
      <header className="space-y-1">
        <Title>{title}</Title>
        {description ? <Muted>{description}</Muted> : null}
      </header>
      <div className="divide-y divide-border-subtle">
        {items.map((item) => (
          <div
            key={`${item.name}-${item.status}`}
            className="space-y-2 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {item.name}
                </p>
                {item.note ? <Muted className="mt-1">{item.note}</Muted> : null}
                {item.lastLogged ? (
                  <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                    Last logged: {item.lastLogged}
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "rounded-[calc(var(--radius)-4px)] border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]",
                  item.status.toLowerCase() === "archived"
                    ? "border-border-subtle text-muted-foreground"
                    : "border-success/45 text-success"
                )}
              >
                {item.status}
              </span>
            </div>
            {item.muscleGroups && item.muscleGroups.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {item.muscleGroups.map((group) => (
                  <span
                    key={`${item.name}-${group}`}
                    className="rounded-[calc(var(--radius)-4px)] border border-border-subtle px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    {group}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SettingsScene({
  title,
  description,
  fields,
}: {
  title: string;
  description?: string;
  fields: Array<{ label: string; value: string; emphasis?: boolean }>;
}) {
  return (
    <Card className="space-y-3">
      <header className="space-y-1">
        <Title>{title}</Title>
        {description ? <Muted>{description}</Muted> : null}
      </header>
      <div className="space-y-2">
        {fields.map((field) => (
          <div
            key={`${field.label}-${field.value}`}
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
    </Card>
  );
}

export function BillingStateScene({
  status,
  title,
  subtitle,
  trialDaysRemaining,
  periodEnd,
  ctaLabel,
  onCta,
}: {
  status: "trial" | "active" | "past_due" | "canceled" | "expired";
  title: string;
  subtitle?: string;
  trialDaysRemaining?: number;
  periodEnd?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <Card className="space-y-3">
      <header className="space-y-1">
        <Title>{title}</Title>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </header>
      <div className="rounded-[calc(var(--radius)-2px)] border border-border-subtle bg-card-elevated px-3 py-2 space-y-1">
        <Eyebrow>Status</Eyebrow>
        <p className="text-sm font-semibold text-foreground">{status}</p>
        {trialDaysRemaining !== undefined ? (
          <Muted>Trial days left: {trialDaysRemaining}</Muted>
        ) : null}
        {periodEnd ? <Muted>Period end: {periodEnd}</Muted> : null}
      </div>
      {ctaLabel ? (
        <button
          type="button"
          onClick={onCta}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[--radius] bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          <LightningBoltIcon className="h-4 w-4" />
          {ctaLabel}
        </button>
      ) : null}
    </Card>
  );
}

export function LogOutcomeScene({
  tone,
  title,
  description,
  detailRows,
  undo,
}: {
  tone: "success" | "error" | "info";
  title: string;
  description?: string;
  detailRows?: TableRow[];
  undo?: {
    title?: string;
    description?: string;
    actionId: string;
    turnId: string;
    onUndo?: (actionId: string, turnId: string) => void;
  };
}) {
  return (
    <div className="space-y-3">
      <StatusBlock tone={tone} title={title} description={description} />
      {detailRows && detailRows.length > 0 ? (
        <TableBlock title="Details" rows={detailRows} />
      ) : null}
      {undo ? (
        <UndoBlock
          title={undo.title}
          description={undo.description}
          actionId={undo.actionId}
          turnId={undo.turnId}
          onUndo={undo.onUndo}
        />
      ) : null}
    </div>
  );
}

export function ClarifyPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="space-y-3">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4 text-accent" />
          <Title>{title}</Title>
        </div>
        {description ? <Muted>{description}</Muted> : null}
      </header>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}

export function ConfirmationPanel({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  return (
    <Card className="space-y-3">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <CheckCircledIcon className="h-4 w-4 text-accent" />
          <Title>{title}</Title>
        </div>
        <Muted>{description}</Muted>
      </header>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ActionSurface
          onPress={onConfirm}
          className="border-destructive/55 bg-destructive/16 hover:bg-destructive/24"
        >
          <LightningBoltIcon className="h-4 w-4" />
          {confirmLabel ?? "Confirm"}
        </ActionSurface>
        <ActionSurface onPress={onCancel}>
          {cancelLabel ?? "Cancel"}
        </ActionSurface>
      </div>
    </Card>
  );
}

export function PreferenceCard({
  title,
  description,
  valueLabel,
  onPress,
}: {
  title: string;
  description?: string;
  valueLabel: string;
  onPress?: () => void;
}) {
  return (
    <ActionSurface
      onPress={onPress}
      className="w-full items-start justify-between px-3 py-3 text-left"
    >
      <div className="space-y-1">
        <Eyebrow>{title}</Eyebrow>
        <p className="text-sm font-semibold text-foreground">{valueLabel}</p>
        {description ? <Muted>{description}</Muted> : null}
      </div>
      <BarChartIcon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </ActionSurface>
  );
}

export function QuickLogComposerScene({
  title,
  exerciseName,
  reps,
  durationSeconds,
  weight,
  unit,
  helperText,
  bindings,
}: {
  title: string;
  exerciseName?: string;
  reps?: string;
  durationSeconds?: string;
  weight?: string;
  unit?: "lbs" | "kg";
  helperText?: string;
  bindings?: ComponentBindings;
}) {
  const { handlers } = useActions();
  const [exerciseValue, setExerciseValue] = useControlledString(
    exerciseName,
    bindings?.exerciseName
  );
  const [repsValue, setRepsValue] = useControlledString(reps, bindings?.reps);
  const [durationValue, setDurationValue] = useControlledString(
    durationSeconds,
    bindings?.durationSeconds
  );
  const [weightValue, setWeightValue] = useControlledString(
    weight,
    bindings?.weight
  );
  const [unitValue, setUnitValue] = useControlledUnit(unit, bindings?.unit);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedExercise = exerciseValue.trim();
    const trimmedReps = repsValue.trim();
    const trimmedDuration = durationValue.trim();
    const trimmedWeight = weightValue.trim();

    if (!trimmedExercise) {
      setError("Enter an exercise name before logging.");
      return;
    }

    if (!trimmedReps && !trimmedDuration) {
      setError("Add reps or duration to log this set.");
      return;
    }

    if (trimmedReps && trimmedDuration) {
      setError("Use reps or duration, not both, for one quick log.");
      return;
    }

    if (trimmedReps && !/^\d+$/.test(trimmedReps)) {
      setError("Reps must be a whole number.");
      return;
    }

    if (trimmedDuration && !/^\d+$/.test(trimmedDuration)) {
      setError("Duration must be in seconds.");
      return;
    }

    if (trimmedWeight && !/^\d+(\.\d+)?$/.test(trimmedWeight)) {
      setError("Weight must be numeric.");
      return;
    }

    setError(null);
    await handlers.quick_log_submit?.({
      exerciseName: trimmedExercise,
      reps: trimmedReps || null,
      durationSeconds: trimmedDuration || null,
      weight: trimmedWeight || null,
      unit: unitValue,
    });
  }

  return (
    <Card className="space-y-3">
      <header className="space-y-1">
        <Title>{title}</Title>
        <Muted>
          {helperText ?? "Use reps or duration. Weight is optional."}
        </Muted>
      </header>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label
            className={quickLogFieldLabel}
            htmlFor="scene-quick-log-exercise"
          >
            Exercise
          </label>
          <input
            id="scene-quick-log-exercise"
            value={exerciseValue}
            onChange={(event) => {
              setExerciseValue(event.target.value);
              setError(null);
            }}
            placeholder="Exercise name"
            className={quickLogInputBase}
          />
          <p className={quickLogFieldHint}>
            Use the exact exercise label you want in history.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              className={quickLogFieldLabel}
              htmlFor="scene-quick-log-reps"
            >
              Reps
            </label>
            <input
              id="scene-quick-log-reps"
              value={repsValue}
              onChange={(event) => {
                setRepsValue(event.target.value);
                setError(null);
              }}
              placeholder="Reps"
              inputMode="numeric"
              className={quickLogInputBase}
            />
          </div>
          <div className="space-y-1">
            <label
              className={quickLogFieldLabel}
              htmlFor="scene-quick-log-duration"
            >
              Duration
            </label>
            <input
              id="scene-quick-log-duration"
              value={durationValue}
              onChange={(event) => {
                setDurationValue(event.target.value);
                setError(null);
              }}
              placeholder="Duration sec"
              inputMode="numeric"
              className={quickLogInputBase}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_124px]">
          <div className="space-y-1">
            <label
              className={quickLogFieldLabel}
              htmlFor="scene-quick-log-weight"
            >
              Weight
            </label>
            <input
              id="scene-quick-log-weight"
              value={weightValue}
              onChange={(event) => {
                setWeightValue(event.target.value);
                setError(null);
              }}
              placeholder="Optional"
              inputMode="decimal"
              className={quickLogInputBase}
            />
          </div>
          <div className="space-y-1">
            <label
              className={quickLogFieldLabel}
              htmlFor="scene-quick-log-unit"
            >
              Unit
            </label>
            <select
              id="scene-quick-log-unit"
              value={unitValue}
              onChange={(event) => {
                setUnitValue(event.target.value === "kg" ? "kg" : "lbs");
                setError(null);
              }}
              className={quickLogInputBase}
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
        {error ? <p className={quickLogFieldError}>{error}</p> : null}
        <button
          type="submit"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[--radius] bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          <LightningBoltIcon className="h-4 w-4" />
          Log set
        </button>
      </form>
    </Card>
  );
}

export function ToneBadge({ tone }: { tone: "success" | "error" | "info" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-[calc(var(--radius)-4px)] border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]",
        toneBadgeClasses(tone)
      )}
    >
      {toneLabel(tone)}
    </span>
  );
}

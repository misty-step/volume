"use client";

import { useEffect, useRef } from "react";
import {
  defineRegistry,
  type ComponentRegistry,
  type ComponentRenderProps,
  useActions,
} from "@json-render/react";
import {
  ActionChip,
  ActionTray,
  AnalyticsOverviewScene,
  BillingStateScene,
  ChoiceCard,
  ClarifyPanel,
  ConfirmationPanel,
  DailySnapshotScene,
  ExerciseInsightScene,
  HistoryTimelineScene,
  LibraryScene,
  LogOutcomeScene,
  PreferenceCard,
  QuickLogComposerScene,
  SceneFrame,
  SettingsScene,
} from "@/components/coach/CoachSceneBlocks";
import {
  BillingPanelBlock,
  ConfirmationBlock,
  DetailPanelBlock,
  EntityListBlock,
  MetricsBlock,
  QuickLogFormBlock,
  StatusBlock,
  SuggestionsBlock,
  TableBlock,
  TrendBlock,
  UndoBlock,
} from "@/components/ui/coach-block";
import type { CoachBlock } from "@/lib/coach/schema";
import { coachPresentationCatalog } from "./catalog";

type LegacyStatusProps = Omit<Extract<CoachBlock, { type: "status" }>, "type">;
type LegacyMetricsProps = Omit<
  Extract<CoachBlock, { type: "metrics" }>,
  "type"
>;
type LegacyTrendProps = Omit<Extract<CoachBlock, { type: "trend" }>, "type">;
type LegacyTableProps = Omit<Extract<CoachBlock, { type: "table" }>, "type">;
type LegacySuggestionsProps = Omit<
  Extract<CoachBlock, { type: "suggestions" }>,
  "type"
>;
type LegacyEntityListProps = Omit<
  Extract<CoachBlock, { type: "entity_list" }>,
  "type"
>;
type LegacyDetailPanelProps = Omit<
  Extract<CoachBlock, { type: "detail_panel" }>,
  "type"
>;
type LegacyBillingProps = Omit<
  Extract<CoachBlock, { type: "billing_panel" }>,
  "type"
>;
type LegacyQuickLogProps = Omit<
  Extract<CoachBlock, { type: "quick_log_form" }>,
  "type"
>;
type LegacyConfirmationProps = Omit<
  Extract<CoachBlock, { type: "confirmation" }>,
  "type"
>;
type LegacyClientActionProps = Omit<
  Extract<CoachBlock, { type: "client_action" }>,
  "type"
>;
type LegacyUndoProps = Omit<Extract<CoachBlock, { type: "undo" }>, "type">;

function arrayOrEmpty<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function useCoachActionHandlers() {
  return useActions().handlers;
}

function LegacySuggestions({
  element,
}: ComponentRenderProps<LegacySuggestionsProps>) {
  const handlers = useCoachActionHandlers();
  const props = element.props;

  return (
    <SuggestionsBlock
      prompts={props.prompts}
      onPrompt={(prompt) => void handlers.submit_prompt?.({ prompt })}
    />
  );
}

function LegacyEntityList({
  element,
}: ComponentRenderProps<LegacyEntityListProps>) {
  const handlers = useCoachActionHandlers();
  const props = element.props;

  return (
    <EntityListBlock
      title={props.title}
      description={props.description ?? undefined}
      items={props.items.map((item) => ({
        ...item,
        id: item.id ?? undefined,
        subtitle: item.subtitle ?? undefined,
        meta: item.meta ?? undefined,
        tags: item.tags ?? undefined,
        prompt: item.prompt ?? undefined,
      }))}
      emptyLabel={props.emptyLabel ?? undefined}
      onPrompt={(prompt) => void handlers.submit_prompt?.({ prompt })}
    />
  );
}

function LegacyDetailPanel({
  element,
}: ComponentRenderProps<LegacyDetailPanelProps>) {
  const handlers = useCoachActionHandlers();
  const props = element.props;

  return (
    <DetailPanelBlock
      title={props.title}
      description={props.description ?? undefined}
      fields={props.fields.map((field) => ({
        ...field,
        emphasis: field.emphasis ?? undefined,
      }))}
      prompts={props.prompts ?? undefined}
      onPrompt={(prompt) => void handlers.submit_prompt?.({ prompt })}
    />
  );
}

function LegacyBillingPanel({
  element,
}: ComponentRenderProps<LegacyBillingProps>) {
  const handlers = useCoachActionHandlers();
  const props = element.props;

  return (
    <BillingPanelBlock
      block={{
        type: "billing_panel",
        status: props.status,
        title: props.title,
        subtitle: props.subtitle ?? undefined,
        trialDaysRemaining: props.trialDaysRemaining ?? undefined,
        periodEnd: props.periodEnd ?? undefined,
        ctaLabel: props.ctaLabel ?? undefined,
        ctaAction: props.ctaAction ?? undefined,
      }}
      onClientAction={(action) => void handlers[action]?.({})}
    />
  );
}

function LegacyQuickLogForm({
  element,
}: ComponentRenderProps<LegacyQuickLogProps>) {
  const handlers = useCoachActionHandlers();
  const props = element.props;

  return (
    <QuickLogFormBlock
      block={{
        type: "quick_log_form",
        title: props.title,
        exerciseName: props.exerciseName ?? undefined,
        defaultUnit: props.defaultUnit ?? undefined,
      }}
      onPrompt={(prompt) => void handlers.submit_prompt?.({ prompt })}
    />
  );
}

function LegacyConfirmation({
  element,
}: ComponentRenderProps<LegacyConfirmationProps>) {
  const handlers = useCoachActionHandlers();
  const props = element.props;

  return (
    <ConfirmationBlock
      title={props.title}
      description={props.description}
      confirmLabel={props.confirmLabel ?? undefined}
      cancelLabel={props.cancelLabel ?? undefined}
      confirmPrompt={props.confirmPrompt}
      cancelPrompt={props.cancelPrompt ?? undefined}
      onPrompt={(prompt) => void handlers.submit_prompt?.({ prompt })}
    />
  );
}

function LegacyClientAction({
  element,
}: ComponentRenderProps<LegacyClientActionProps>) {
  const handlers = useCoachActionHandlers();
  const firedRef = useRef(false);
  const props = element.props;

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    if (props.action === "set_weight_unit" && "unit" in props.payload) {
      void handlers.set_preference?.({
        key: "unit",
        value: props.payload.unit,
      });
      return;
    }

    if (props.action === "set_sound" && "enabled" in props.payload) {
      void handlers.set_preference?.({
        key: "sound_enabled",
        value: props.payload.enabled,
      });
      return;
    }

    if (props.action === "open_checkout") {
      void handlers.open_checkout?.({});
      return;
    }

    if (props.action === "open_billing_portal") {
      void handlers.open_billing_portal?.({});
    }
  }, [handlers, props.action, props.payload]);

  return null;
}

function LegacyUndo({ element }: ComponentRenderProps<LegacyUndoProps>) {
  const handlers = useCoachActionHandlers();
  const props = element.props;

  return (
    <UndoBlock
      title={props.title ?? undefined}
      description={props.description ?? undefined}
      actionId={props.actionId}
      turnId={props.turnId}
      onUndo={(actionId, turnId) =>
        void handlers.undo_agent_action?.({ actionId, turnId })
      }
    />
  );
}

const legacyRegistry: ComponentRegistry = {
  Card: ({ children }) => <div className="space-y-3">{children}</div>,
  Status: ({ element }: ComponentRenderProps<LegacyStatusProps>) => (
    <StatusBlock
      tone={element.props.tone}
      title={element.props.title}
      description={element.props.description ?? undefined}
    />
  ),
  Metrics: ({ element }: ComponentRenderProps<LegacyMetricsProps>) => (
    <MetricsBlock title={element.props.title} metrics={element.props.metrics} />
  ),
  Trend: ({ element }: ComponentRenderProps<LegacyTrendProps>) => (
    <TrendBlock
      title={element.props.title}
      subtitle={element.props.subtitle}
      points={element.props.points}
      bestDay={element.props.bestDay}
      total={element.props.total}
      metric={element.props.metric}
    />
  ),
  Table: ({ element }: ComponentRenderProps<LegacyTableProps>) => (
    <TableBlock
      title={element.props.title}
      rows={element.props.rows.map((row) => ({
        ...row,
        meta: row.meta ?? undefined,
      }))}
    />
  ),
  Suggestions: LegacySuggestions,
  EntityList: LegacyEntityList,
  DetailPanel: LegacyDetailPanel,
  BillingPanel: LegacyBillingPanel,
  QuickLogForm: LegacyQuickLogForm,
  Confirmation: LegacyConfirmation,
  ClientAction: LegacyClientAction,
  Undo: LegacyUndo,
};

const { registry: presentationRegistry } = defineRegistry(
  coachPresentationCatalog,
  {
    components: {
      Scene: ({ props, children }) => (
        <SceneFrame title={props.title} subtitle={props.subtitle ?? undefined}>
          {children}
        </SceneFrame>
      ),
      ActionTray: ({ children }) => <ActionTray>{children}</ActionTray>,
      ActionChip: ({ props, emit }) => (
        <ActionChip label={props.label} onPress={() => emit("press")} />
      ),
      ChoiceCard: ({ props, emit }) => (
        <ChoiceCard
          title={props.title}
          description={props.description ?? undefined}
          meta={props.meta ?? undefined}
          tags={props.tags ?? undefined}
          onPress={() => emit("press")}
        />
      ),
      DailySnapshot: ({ props }) => (
        <DailySnapshotScene
          title={props.title}
          subtitle={props.subtitle ?? undefined}
          totalSets={props.totalSets}
          totalReps={props.totalReps}
          totalDurationSeconds={props.totalDurationSeconds}
          exerciseCount={props.exerciseCount}
          topExercises={props.topExercises.map((exercise) => ({
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps ?? undefined,
            durationSeconds: exercise.durationSeconds ?? undefined,
          }))}
        />
      ),
      AnalyticsOverview: ({ props }) => (
        <AnalyticsOverviewScene
          currentStreak={props.currentStreak}
          longestStreak={props.longestStreak}
          workoutDays={props.workoutDays}
          recentVolume={props.recentVolume}
          recentPrs={arrayOrEmpty(props.recentPrs).map((entry) => ({
            ...entry,
            detail: entry.detail ?? undefined,
          }))}
          overload={arrayOrEmpty(props.overload).map((entry) => ({
            ...entry,
            note: entry.note ?? undefined,
          }))}
          focusSuggestions={arrayOrEmpty(props.focusSuggestions)}
        />
      ),
      ExerciseInsight: ({ props }) => (
        <ExerciseInsightScene
          exerciseName={props.exerciseName}
          takeaway={props.takeaway ?? undefined}
          summaryMetrics={props.summaryMetrics}
          trend={
            props.trend
              ? {
                  subtitle: props.trend.subtitle ?? undefined,
                  metric: props.trend.metric,
                  total: props.trend.total,
                  bestDay: props.trend.bestDay,
                  points: props.trend.points,
                }
              : undefined
          }
          recentRows={
            props.recentRows?.map((row) => ({
              ...row,
              meta: row.meta ?? undefined,
            })) ?? undefined
          }
        />
      ),
      HistoryTimeline: ({ props }) => (
        <HistoryTimelineScene
          sessions={arrayOrEmpty(props.sessions).map((session) => ({
            dateLabel: session.dateLabel,
            summary: session.summary ?? undefined,
            rows: arrayOrEmpty(session.rows).map((row) => ({
              ...row,
              meta: row.meta ?? undefined,
            })),
          }))}
        />
      ),
      LibraryScene: ({ props }) => (
        <LibraryScene
          title={props.title}
          description={props.description ?? undefined}
          items={props.items.map((item) => ({
            name: item.name,
            status: item.status,
            muscleGroups: item.muscleGroups ?? undefined,
            lastLogged: item.lastLogged ?? undefined,
            note: item.note ?? undefined,
          }))}
        />
      ),
      SettingsScene: ({ props }) => (
        <SettingsScene
          title={props.title}
          description={props.description ?? undefined}
          fields={props.fields.map((field) => ({
            ...field,
            emphasis: field.emphasis ?? undefined,
          }))}
        />
      ),
      BillingState: ({ props, emit }) => (
        <BillingStateScene
          status={props.status}
          title={props.title}
          subtitle={props.subtitle ?? undefined}
          trialDaysRemaining={props.trialDaysRemaining ?? undefined}
          periodEnd={props.periodEnd ?? undefined}
          ctaLabel={props.ctaLabel ?? undefined}
          onCta={() => emit("cta")}
        />
      ),
      LogOutcome: ({ props, emit }) => (
        <LogOutcomeScene
          tone={props.tone}
          title={props.title}
          description={props.description ?? undefined}
          detailRows={
            props.detailRows?.map((row) => ({
              ...row,
              meta: row.meta ?? undefined,
            })) ?? undefined
          }
          undo={
            props.undoActionId && props.undoTurnId
              ? {
                  title: props.undoTitle ?? undefined,
                  description: props.undoDescription ?? undefined,
                  actionId: props.undoActionId,
                  turnId: props.undoTurnId,
                  onUndo: () => emit("undo"),
                }
              : undefined
          }
        />
      ),
      ClarifyPanel: ({ props, children }) => (
        <ClarifyPanel
          title={props.title}
          description={props.description ?? undefined}
        >
          {children}
        </ClarifyPanel>
      ),
      ConfirmationPanel: ({ props, emit }) => (
        <ConfirmationPanel
          title={props.title}
          description={props.description}
          confirmLabel={props.confirmLabel ?? undefined}
          cancelLabel={props.cancelLabel ?? undefined}
          onConfirm={() => emit("confirm")}
          onCancel={() => emit("cancel")}
        />
      ),
      PreferenceCard: ({ props, emit }) => (
        <PreferenceCard
          title={props.title}
          description={props.description ?? undefined}
          valueLabel={props.valueLabel}
          onPress={() => emit("press")}
        />
      ),
      QuickLogComposer: ({ props, bindings }) => (
        <QuickLogComposerScene
          title={props.title}
          exerciseName={props.exerciseName ?? undefined}
          reps={props.reps ?? undefined}
          durationSeconds={props.durationSeconds ?? undefined}
          weight={props.weight ?? undefined}
          unit={props.unit ?? undefined}
          helperText={props.helperText ?? undefined}
          bindings={bindings}
        />
      ),
    },
    actions: {
      submit_prompt: async () => {},
      prefill_prompt: async () => {},
      undo_agent_action: async () => {},
      set_preference: async () => {},
      open_checkout: async () => {},
      open_billing_portal: async () => {},
      quick_log_submit: async () => {},
    },
  }
);

export const registry: ComponentRegistry = {
  ...legacyRegistry,
  ...presentationRegistry,
};

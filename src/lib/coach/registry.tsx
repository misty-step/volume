"use client";

import { defineRegistry } from "@json-render/react";
import { catalog } from "./catalog";
import {
  StatusBlock,
  UndoBlock,
  MetricsBlock,
  TrendBlock,
  TableBlock,
  EntityListBlock,
  DetailPanelBlock,
  SuggestionsBlock,
  BillingPanelBlock,
  ConfirmationBlock,
  QuickLogFormBlock,
} from "@/components/ui/coach-block";

/**
 * json-render registry — maps catalog component types to existing React
 * implementations. Wraps the same UI components used before the migration;
 * the rendering output is unchanged.
 *
 * Event callbacks (onPrompt, onUndo, onClientAction) are injected via React
 * context from the CoachChat provider — the registry components emit named
 * events that the provider intercepts.
 */
export const { registry } = defineRegistry(catalog, {
  components: {
    Status: ({ props }: any) => (
      <StatusBlock
        tone={props.tone}
        title={props.title}
        description={props.description ?? undefined}
      />
    ),

    Metrics: ({ props }: any) => (
      <MetricsBlock title={props.title} metrics={props.metrics} />
    ),

    Trend: ({ props }: any) => (
      <TrendBlock
        title={props.title}
        subtitle={props.subtitle}
        points={props.points}
        bestDay={props.bestDay}
        total={props.total}
        metric={props.metric}
      />
    ),

    Table: ({ props }: any) => (
      <TableBlock
        title={props.title}
        rows={props.rows.map((r: any) => ({
          ...r,
          meta: r.meta ?? undefined,
        }))}
      />
    ),

    Suggestions: ({ props, emit }: any) => (
      <SuggestionsBlock
        prompts={props.prompts}
        onPrompt={(prompt: string) => emit(`prompt:${prompt}`)}
      />
    ),

    EntityList: ({ props, emit }: any) => (
      <EntityListBlock
        title={props.title}
        description={props.description ?? undefined}
        items={props.items.map((item: any) => ({
          ...item,
          id: item.id ?? undefined,
          subtitle: item.subtitle ?? undefined,
          meta: item.meta ?? undefined,
          tags: item.tags ?? undefined,
          prompt: item.prompt ?? undefined,
        }))}
        emptyLabel={props.emptyLabel ?? undefined}
        onPrompt={(prompt: string) => emit(`prompt:${prompt}`)}
      />
    ),

    DetailPanel: ({ props, emit }: any) => (
      <DetailPanelBlock
        title={props.title}
        description={props.description ?? undefined}
        fields={props.fields.map((f: any) => ({
          ...f,
          emphasis: f.emphasis ?? undefined,
        }))}
        prompts={props.prompts ?? undefined}
        onPrompt={(prompt: string) => emit(`prompt:${prompt}`)}
      />
    ),

    BillingPanel: ({ props, emit }: any) => (
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
        onClientAction={(action: string) => emit(`client-action:${action}`)}
      />
    ),

    QuickLogForm: ({ props, emit }: any) => (
      <QuickLogFormBlock
        block={{
          type: "quick_log_form",
          title: props.title,
          exerciseName: props.exerciseName ?? undefined,
          defaultUnit: props.defaultUnit ?? undefined,
        }}
        onPrompt={(prompt: string) => emit(`prompt:${prompt}`)}
      />
    ),

    Confirmation: ({ props, emit }: any) => (
      <ConfirmationBlock
        title={props.title}
        description={props.description}
        confirmLabel={props.confirmLabel ?? undefined}
        cancelLabel={props.cancelLabel ?? undefined}
        confirmPrompt={props.confirmPrompt}
        cancelPrompt={props.cancelPrompt ?? undefined}
        onPrompt={(prompt: string) => emit(`prompt:${prompt}`)}
      />
    ),

    // ClientAction is invisible — side effects handled by the chat hook.
    ClientAction: () => null,

    Undo: ({ props, emit }: any) => (
      <UndoBlock
        title={props.title ?? undefined}
        description={props.description ?? undefined}
        actionId={props.actionId}
        turnId={props.turnId}
        onUndo={(actionId: string, turnId: string) =>
          emit(`undo:${actionId}:${turnId}`)
        }
      />
    ),
  },
  actions: {},
});

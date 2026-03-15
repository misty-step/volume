"use client";

import { defineRegistry } from "@json-render/react";
import { catalog } from "./catalog";
import { useCoachChatCallbacks } from "./coach-chat-context";
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
 * implementations. Interactive blocks use CoachChatContext for callbacks
 * (sendPrompt, undoAction, runClientAction) instead of json-render emit.
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

    Suggestions: ({ props }: any) => {
      const { sendPrompt } = useCoachChatCallbacks();
      return <SuggestionsBlock prompts={props.prompts} onPrompt={sendPrompt} />;
    },

    EntityList: ({ props }: any) => {
      const { sendPrompt } = useCoachChatCallbacks();
      return (
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
          onPrompt={sendPrompt}
        />
      );
    },

    DetailPanel: ({ props }: any) => {
      const { sendPrompt } = useCoachChatCallbacks();
      return (
        <DetailPanelBlock
          title={props.title}
          description={props.description ?? undefined}
          fields={props.fields.map((f: any) => ({
            ...f,
            emphasis: f.emphasis ?? undefined,
          }))}
          prompts={props.prompts ?? undefined}
          onPrompt={sendPrompt}
        />
      );
    },

    BillingPanel: ({ props }: any) => {
      const { runClientAction } = useCoachChatCallbacks();
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
          onClientAction={(action: string) =>
            runClientAction(action as "open_checkout" | "open_billing_portal")
          }
        />
      );
    },

    QuickLogForm: ({ props }: any) => {
      const { sendPrompt } = useCoachChatCallbacks();
      return (
        <QuickLogFormBlock
          block={{
            type: "quick_log_form",
            title: props.title,
            exerciseName: props.exerciseName ?? undefined,
            defaultUnit: props.defaultUnit ?? undefined,
          }}
          onPrompt={sendPrompt}
        />
      );
    },

    Confirmation: ({ props }: any) => {
      const { sendPrompt } = useCoachChatCallbacks();
      return (
        <ConfirmationBlock
          title={props.title}
          description={props.description}
          confirmLabel={props.confirmLabel ?? undefined}
          cancelLabel={props.cancelLabel ?? undefined}
          confirmPrompt={props.confirmPrompt}
          cancelPrompt={props.cancelPrompt ?? undefined}
          onPrompt={sendPrompt}
        />
      );
    },

    // ClientAction is invisible — side effects handled by useCoachChat.
    ClientAction: () => null,

    Undo: ({ props }: any) => {
      const { undoAction } = useCoachChatCallbacks();
      return (
        <UndoBlock
          title={props.title ?? undefined}
          description={props.description ?? undefined}
          actionId={props.actionId}
          turnId={props.turnId}
          onUndo={undoAction}
        />
      );
    },
  },
  actions: {},
});

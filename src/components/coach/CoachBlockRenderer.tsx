"use client";

import type { CoachBlock } from "@/lib/coach/schema";
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

export function CoachBlockRenderer({
  block,
  onPrompt,
  onUndo,
  onClientAction,
}: {
  block: CoachBlock;
  onPrompt: (prompt: string) => void;
  onUndo?: (actionId: string, turnId: string) => void;
  onClientAction?: (action: "open_checkout" | "open_billing_portal") => void;
}) {
  if (block.type === "client_action") return null;

  switch (block.type) {
    case "status":
      return (
        <StatusBlock
          tone={block.tone}
          title={block.title}
          description={block.description}
        />
      );
    case "undo":
      return (
        <UndoBlock
          title={block.title}
          description={block.description}
          actionId={block.actionId}
          turnId={block.turnId}
          onUndo={onUndo}
        />
      );
    case "metrics":
      return <MetricsBlock title={block.title} metrics={block.metrics} />;
    case "trend":
      return (
        <TrendBlock
          title={block.title}
          subtitle={block.subtitle}
          points={block.points}
          bestDay={block.bestDay}
          total={block.total}
          metric={block.metric}
        />
      );
    case "table":
      return <TableBlock title={block.title} rows={block.rows} />;
    case "entity_list":
      return (
        <EntityListBlock
          title={block.title}
          description={block.description}
          items={block.items}
          emptyLabel={block.emptyLabel}
          onPrompt={onPrompt}
        />
      );
    case "detail_panel":
      return (
        <DetailPanelBlock
          title={block.title}
          description={block.description}
          fields={block.fields}
          prompts={block.prompts}
          onPrompt={onPrompt}
        />
      );
    case "suggestions":
      return <SuggestionsBlock prompts={block.prompts} onPrompt={onPrompt} />;
    case "billing_panel":
      return (
        <BillingPanelBlock block={block} onClientAction={onClientAction} />
      );
    case "confirmation":
      return (
        <ConfirmationBlock
          title={block.title}
          description={block.description}
          confirmLabel={block.confirmLabel}
          cancelLabel={block.cancelLabel}
          confirmPrompt={block.confirmPrompt}
          cancelPrompt={block.cancelPrompt}
          onPrompt={onPrompt}
        />
      );
    case "quick_log_form":
      return <QuickLogFormBlock block={block} onPrompt={onPrompt} />;
    default: {
      const _exhaustive: never = block;
      void _exhaustive;
      return null;
    }
  }
}

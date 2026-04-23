import type { Spec } from "@json-render/core";
import type { CoachBlock } from "@/lib/coach/schema";
import type { ToolExecutionRecord } from "./types";

const LEGACY_COMPONENT_BY_BLOCK_TYPE = {
  status: "Status",
  metrics: "Metrics",
  trend: "Trend",
  table: "Table",
  suggestions: "Suggestions",
  entity_list: "EntityList",
  detail_panel: "DetailPanel",
  billing_panel: "BillingPanel",
  quick_log_form: "QuickLogForm",
  confirmation: "Confirmation",
  client_action: "ClientAction",
  undo: "Undo",
} satisfies Record<CoachBlock["type"], string>;

function toLegacyElement(block: CoachBlock) {
  const { type, ...props } = block;

  return {
    type: LEGACY_COMPONENT_BY_BLOCK_TYPE[type],
    props,
    children: [],
  };
}

export function buildLegacyBlocksSpec(
  records: ToolExecutionRecord[],
  followUpPrompts: string[] = []
): Spec | null {
  const blocks = records.flatMap((record) => record.legacyBlocks);
  const prompts = followUpPrompts.filter((prompt) => prompt.trim());

  if (prompts.length > 0) {
    blocks.push({ type: "suggestions", prompts });
  }

  if (blocks.length === 0) {
    return null;
  }

  const children = blocks.map((_, index) => `block_${index}`);
  const elements: Spec["elements"] = {
    root: {
      type: "Card",
      props: {},
      children,
    },
  };

  blocks.forEach((block, index) => {
    elements[`block_${index}`] = toLegacyElement(block);
  });

  return {
    root: "root",
    elements,
  };
}

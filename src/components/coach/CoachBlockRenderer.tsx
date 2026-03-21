"use client";

import { Renderer, JSONUIProvider } from "@json-render/react";
import { registry } from "@/lib/coach/registry";
import type { Spec } from "@json-render/core";

/**
 * Renders a json-render spec using the coach component registry.
 *
 * JSONUIProvider wraps Renderer with all required contexts
 * (state, visibility, actions, validation).
 */
export function CoachSpecRenderer({
  spec,
  loading,
}: {
  spec: Spec | null;
  loading?: boolean;
}) {
  if (!spec) return null;
  return (
    <JSONUIProvider registry={registry} handlers={{}}>
      <Renderer spec={spec} registry={registry} loading={loading} />
    </JSONUIProvider>
  );
}

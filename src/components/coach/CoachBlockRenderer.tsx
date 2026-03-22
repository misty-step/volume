"use client";

import { Renderer, JSONUIProvider } from "@json-render/react";
import { registry } from "@/lib/coach/presentation/registry";
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
  handlers,
}: {
  spec: Spec | null;
  loading?: boolean;
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
}) {
  if (!spec) return null;
  return (
    <JSONUIProvider registry={registry} handlers={handlers ?? {}}>
      <Renderer spec={spec} registry={registry} loading={loading} />
    </JSONUIProvider>
  );
}

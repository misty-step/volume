"use client";

import { Renderer } from "@json-render/react";
import { registry } from "@/lib/coach/registry";
import type { Spec } from "@json-render/core";

/**
 * Renders a json-render spec using the coach component registry.
 *
 * Replaces the former switch-based CoachBlock renderer with json-render's
 * catalog-constrained Renderer component.
 */
export function CoachSpecRenderer({
  spec,
  loading,
}: {
  spec: Spec | null;
  loading?: boolean;
}) {
  if (!spec) return null;
  return <Renderer spec={spec} registry={registry} loading={loading} />;
}

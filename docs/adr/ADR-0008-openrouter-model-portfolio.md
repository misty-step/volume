# ADR-0008: OpenRouter Model Portfolio

Date: 2026-02-16
Status: accepted

## Context and Problem Statement

Volume uses LLMs for the coach agent, report copy, and exercise classification. We previously used GPT-family defaults and provider-specific paths, which increased cost and introduced parameter incompatibilities and config drift. We want a single OpenAI-compatible gateway (OpenRouter) plus a small model portfolio that is cheap, tool-capable, and easy to swap.

## Considered Options

### Option 1: Keep OpenAI GPT defaults (not chosen)

- Pros: Familiar, strong quality.
- Cons: Higher cost; model-specific parameter constraints; multiple providers to manage.

### Option 2: Keep Gemini as default on OpenRouter (not chosen)

- Pros: Cheap; already wired.
- Cons: We want to standardize around a portfolio explicitly including MiniMax/GLM/Kimi.

### Option 3: OpenRouter portfolio (chosen)

- Default: `minimax/minimax-m2.5`
- Writer: `moonshotai/kimi-k2.5`
- Fallback: `z-ai/glm-5`

- Pros: Tool calling + JSON mode; strong cost/perf; single gateway; easy swaps by changing constants/env.
- Cons: Model quality can drift over time; fallback usage is not automatic everywhere yet.

## Decision Outcome

**Chosen**: Option 3.

Rationale: Minimizes integration complexity (one gateway, OpenAI-compatible API) while improving cost and avoiding GPT-only constraints.

### Consequences

**Good**

- All LLM calls route through OpenRouter with consistent API shape.
- Default models are non-GPT and cost-effective.

**Bad**

- Coach/report quality is now model-dependent; we should add evals to catch regressions.

**Neutral**

- Model IDs/pricing can change; keep them centralized and adjustable.

## Implementation Notes

- Defaults: `convex/lib/openrouter.ts`, `src/app/api/coach/route.ts`
- Release note writing: `scripts/generate-releases.ts`
- Coach env override: `COACH_AGENT_MODEL`

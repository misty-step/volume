# ADR-0008: OpenRouter Model Portfolio

Date: 2026-02-16
Updated: 2026-04-03
Status: accepted

## Context and Problem Statement

Volume uses LLMs for the coach agent, report copy, and exercise classification. We previously used GPT-family defaults and provider-specific paths, which increased cost and introduced parameter incompatibilities and config drift. We want a single OpenAI-compatible gateway (OpenRouter) plus a small model portfolio that is cheap, tool-capable, and easy to swap.

### April 2026 Update

Commit 470aa31 collapsed the original portfolio to a single preview model
(`google/gemini-3.1-flash-lite-preview`) across all slots. This caused
intermittent "something went wrong" errors in production: the preview model
would timeout or error with no fallback, no retry. Root cause: Flash-Lite is
designed for extraction/classification, not agentic tool calling.

Fix: ordered fallback chain with provider diversity and automatic retry.

## Considered Options

### Option 1: Keep OpenAI GPT defaults (not chosen)

- Pros: Familiar, strong quality.
- Cons: Higher cost; model-specific parameter constraints; multiple providers to manage.

### Option 2: Single cheap model, no fallback (rejected, April 2026)

- Pros: Simple, cheap.
- Cons: Single point of failure. Preview model instability caused production outages.

### Option 3: Fallback chain with provider diversity (chosen, April 2026)

Coach chain (tried in order on failure):

1. `qwen/qwen3.5-flash-02-23` — 97.5% tool-calling pass rate, $0.065/$0.26, 1M ctx
2. `minimax/minimax-m2.7` — 86.2% PinchBench (near Opus), agentic-tuned, $0.30/$1.20
3. `google/gemini-3-flash-preview` — 78% SWE-bench, near-Pro quality, $0.50/$3.00

Classification: `qwen/qwen3.5-flash-02-23`

Three different providers (Alibaba, MiniMax, Google) ensure uncorrelated failures.

## Decision Outcome

**Chosen**: Option 3.

Rationale: Eliminates single-model SPOF while staying cost-effective. Primary model
is 75% cheaper than the previous Flash-Lite. Fallback models are progressively
more expensive but more reliable. Automatic retry in the planner ensures users
rarely see errors from transient model failures.

### Consequences

**Good**

- All LLM calls route through OpenRouter with consistent API shape.
- Automatic fallback means transient failures are invisible to users.
- Provider diversity protects against single-provider outages.
- Primary model is cheaper than the previous single model.

**Bad**

- Fallback adds latency when triggered (sequential retry, not parallel).
- Three models to monitor for deprecation/pricing changes.

**Neutral**

- Model IDs/pricing are centralized in `policy.ts` — easy to swap.
- `COACH_AGENT_MODEL` env override replaces the chain with a single model for A/B testing.

## Implementation Notes

- Canonical policy: `src/lib/openrouter/policy.ts` (defines `MODEL_CHAINS`)
- Runtime: `src/lib/coach/server/runtime.ts` (creates `CoachRuntime` with fallbacks)
- Retry logic: `src/app/api/coach/route.ts` (planner + presentation fallback)
- Other consumers: `convex/lib/openrouter.ts`, `scripts/generate-releases.ts`
- Health + deploy validation: `src/app/api/health/route.ts`, `scripts/verify-env.sh`
- Coach env override: `COACH_AGENT_MODEL` (overrides entire chain with single model)

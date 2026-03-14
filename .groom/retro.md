# Implementation Retrospective

## Entry: #342 — [P1] Migrate coach to AI SDK 6 (ToolLoopAgent + useChat) (2026-02-23)

**Effort:** predicted medium → actual medium
**Scope changes:** json-render deferred (requires replacing SSE wire + useCoachChat, not just adding a renderer); prepareStep deferred (no profiling data); scope landed as backend-only migration
**Blockers:** json-render scoped as @json-render/core (not bare `json-render`) — missed during npm lookup; Moonbridge/Codex usage limit hit mid-session
**Pattern:** AI SDK chunk fields differ from docs: tool-result uses 'output' not 'result'; MockLanguageModelV3 doStream is called once per step, not once total

---

## Entry: #338 — [P1] Extract shared coach turn runner for JSON and SSE parity (2026-03-07)

**Effort:** predicted medium → actual medium
**Scope changes:** landed shared orchestration extraction, parity tests, and docs update; did not move `resolveExerciseName` out of the route because that widens into a deeper boundary cleanup
**Blockers:** full authenticated dogfood was blocked by local Clerk auth; used route-level parity tests, full pre-push checks, and a local unauthenticated smoke instead
**Pattern:** refactors need tests on the extracted seam itself, not just end behavior; adding `turn-runner.test.ts` made the boundary explicit before moving code

---

## Entry: #339 — [P1] Canonicalize OpenRouter model portfolio, routing policy, and runtime config (2026-03-12)

**Effort:** predicted medium → actual medium
**Scope changes:** landed the shared OpenRouter policy module, routed coach/Convex/release scripts through it, trimmed the public health payload to coach-relevant metadata, and added a tiny script bridge so bash env validation can consume the same contract
**Blockers:** local production build and pre-push build-check were blocked by missing valid Stripe and Clerk env vars in this worktree, so the branch shipped with targeted verification, coverage, and live local health proof instead of a clean local build
**Pattern:** if a shell script depends on typed app config, bridge through a tiny script rooted at the script directory rather than importing source relative to the caller's current working directory

---

# Implementation Retrospective

## Entry: #342 — [P1] Migrate coach to AI SDK 6 (ToolLoopAgent + useChat) (2026-02-23)

**Effort:** predicted medium → actual medium
**Scope changes:** json-render deferred (requires replacing SSE wire + useCoachChat, not just adding a renderer); prepareStep deferred (no profiling data); scope landed as backend-only migration
**Blockers:** json-render scoped as @json-render/core (not bare `json-render`) — missed during npm lookup; Moonbridge/Codex usage limit hit mid-session
**Pattern:** AI SDK chunk fields differ from docs: tool-result uses 'output' not 'result'; MockLanguageModelV3 doStream is called once per step, not once total

---

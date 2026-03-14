# Project: Volume

## Vision

Volume is a chat-first workout tracker where an AI coach replaces traditional UI pages with generative, context-aware interfaces.

**North Star:** One conversation surface replaces everything. No dedicated pages for logging, analytics, settings, or history. The agent proactively renders the right components at the right time, responds to natural language, and lets users interact with generated UI directly. Opening Volume feels like resuming a conversation with a coach who already knows what you need.

**Target User:** Anyone who tracks workouts and wants the friction removed. Power users who log daily. Beginners who need guidance. People who find traditional workout apps tedious.

**Current Focus:** Targeted restructuring — conversation persistence, user memory, tool consolidation, json-render migration, observability.

**Key Differentiators:**

- Chat-forward, not chat-only — agent generates rich interactive UI components on demand
- Proactive intelligence — surfaces insights before the user asks
- Pre-demand rendering — kickoff API assembles personalized dashboard on session start
- Direct manipulation + natural language — both paths converge
- Transparent and recoverable — every agent action is auditable and undoable

## Domain Glossary

| Term            | Definition                                                                        |
| --------------- | --------------------------------------------------------------------------------- |
| Coach           | The AI agent that handles all user interaction via conversation                   |
| Block           | A rendered UI component output by the agent (MetricsGrid, TrendChart, etc.)       |
| Catalog         | The constrained set of component types the agent can output (json-render pattern) |
| Tool            | A server-side function the agent can call (logSet, getHistory, etc.)              |
| Turn            | One user message + agent response cycle                                           |
| Kickoff payload | Pre-computed initial state fetched on app open before first message               |
| Fallback        | Deterministic regex-based intent handler when LLM is unavailable                  |
| ToolSpec        | Intermediate representation mapping tool results to catalog component types       |
| Set             | A single exercise entry (reps/weight/duration)                                    |
| Session         | All sets logged in a single day                                                   |
| Soft delete     | Exercises use `deletedAt` — never hard-deleted, same-name creates auto-restore    |

## Active Focus

- **Milestone:** Agentic Foundation
- **Key Issues:** #344 (conversation persistence), #425 (user memory), #426 (tool consolidation), #424 (json-render), #411 (summary accuracy), #403 (exercise routing)
- **Theme:** Fix foundations — persistence, memory, observability, architecture simplification. Then ship proactive intelligence.

**Locked technical directions (2026-03-14 /groom):**

- Generative UI: **json-render** (Vercel Labs, v0.14.0) — catalog-constrained JSONL streaming. Tools return data, model generates UI spec.
- Agent framework: **AI SDK 6** `streamText` with `stopWhen` — keep current loop, do NOT adopt `@convex-dev/agent` (pre-1.0, revisit at 1.0)
- Tool surface: **Consolidate 26 → ~10 capability groups** — fewer, deeper tools = better model accuracy
- Conversation persistence: **Custom Convex tables** (`coachSessions` + `coachMessages`) — server-side message storage, hydrate on reconnect
- User memory: **Saved facts** (ChatGPT pattern, flat text in system prompt) + **observation log** (Mastra pattern, post-session compression). No vector DB.
- Observability: **Helicone** via OpenRouter headers — cost, latency, quality dashboards
- Design tokens: **CSS variables + Tailwind** — semantic tokens, light/dark/system (shipped)
- Accent color: TBD

## Quality Bar

What "done" means beyond "tests pass":

- [ ] Agent handles the same request 5 different ways without breaking
- [ ] Coach responds to ambiguous/partial input with a sensible clarifying question, not an error
- [ ] All coach blocks render correctly in light, dark, and system themes
- [ ] Mobile: all touch targets ≥ 44px, UI is usable above keyboard
- [ ] No hardcoded color values in coach components — all tokens
- [ ] Long sessions (50+ messages) maintain coherent context without degradation
- [ ] Kickoff payload loads in < 1s
- [ ] Every mutation is undoable

## Patterns to Follow

### Tool factory (moneta pattern)

```typescript
export function createCoachTools(userId: string, options: CreateCoachToolsOptions) {
  const memoLoad = <T>(key: string, load: () => Promise<T>): Promise<T> => { ... };
  return {
    logSet: tool({ description: "...", inputSchema: z.object({...}), execute: async (args) => { ... } }),
    getTodaySummary: tool({ ... }),
  };
}
```

### CSS semantic tokens

```css
/* globals.css — define here, reference everywhere */
:root {
  --surface-primary: #fcfcfb;
  --text-accent: var(--accent);
  --accent: #f97316; /* TBD */
}
/* tailwind.config.ts maps to these variables */
```

### Convex mutation ownership check

```typescript
// Every mutation must verify ownership before touching data
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new ConvexError("Unauthorized");
const existing = await ctx.db.get(id);
if (existing.userId !== identity.subject) throw new ConvexError("Forbidden");
```

### Soft delete for exercises

```typescript
// Never hard-delete exercises — use deletedAt
// Same-name creates auto-restore the deleted exercise
await ctx.db.patch(id, { deletedAt: Date.now() });
```

## Lessons Learned

| Decision                      | Outcome                                                      | Lesson                                                            |
| ----------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Custom planner loop           | Brittle — 8 failure modes, no prepareStep, regex parsing     | Use AI SDK Agent class; don't roll your own tool loop             |
| TypeScript design token files | Not wired to CSS — values diverge, hardcoded in components   | CSS variables + Tailwind config from day one                      |
| 30-message sliding window     | Context loss in long sessions, no summarization              | Persist conversations server-side; compress with observer pattern |
| Regex intent parsing          | 15 hardcoded aliases, 20% failure rate on natural input      | Route via LLM only; fail explicitly when runtime is unavailable   |
| 26 flat tools                 | Wide surface taxes model selection accuracy                  | Consolidate to ~10 capability groups; fewer, deeper tools         |
| `buildEndOfTurnSuggestions`   | 130 lines of hardcoded if/else for what the LLM already does | Delete — let the model generate contextual suggestions            |
| Custom block SSE protocol     | Works but bespoke; no ecosystem leverage                     | Migrate to json-render for catalog-constrained JSONL streaming    |
| `@convex-dev/agent` (v0.3.2)  | Pre-1.0, open data-corruption bugs, block schema doesn't fit | Wait for 1.0; build conversation persistence on plain Convex      |

---

_Last updated: 2026-03-14_
_Updated during: /groom session_

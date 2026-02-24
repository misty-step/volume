# Project: Volume

## Vision

Volume is a chat-first workout tracker where an AI coach replaces traditional UI pages with generative, context-aware interfaces.

**North Star:** One conversation surface replaces everything. No dedicated pages for logging, analytics, settings, or history. The agent proactively renders the right components at the right time, responds to natural language, and lets users interact with generated UI directly. Opening Volume feels like resuming a conversation with a coach who already knows what you need.

**Target User:** Anyone who tracks workouts and wants the friction removed. Power users who log daily. Beginners who need guidance. People who find traditional workout apps tedious.

**Current Focus:** Build the agentic foundation — generative UI catalog, AI SDK 6 agent loop, Mastra memory, CSS variable design tokens.

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
- **Key Issues:** #341 (epic), #342 (AI SDK 6 + json-render), #349 (catalog), #344 (Mastra memory), #350 (design tokens)
- **Theme:** Make the agent robust, generative, and memory-aware. Consolidate all UX through the coach.
- **Execution docs:** `docs/specs/341-agentic-ui-pivot-spec.md`, `docs/design/341-agentic-ui-pivot-architecture.md`

**Locked technical directions (2026-02-22 /groom):**

- Generative UI: **json-render** (Vercel Labs) — catalog-constrained JSONL patches
- Agent framework: **AI SDK 6 Agent** — `prepareStep`, `stopWhen`, tool factory
- Tool pattern: **Moneta-style factory** — `createCoachTools(userId)` scoped object
- Memory: **Mastra Observational Memory** — 94.87% LongMemEval, AI SDK plugin
- Design tokens: **CSS variables + Tailwind** — semantic tokens, light/dark/system
- Accent color: TBD (exploring beyond current safety-orange)

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

| Decision                      | Outcome                                                    | Lesson                                                |
| ----------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| Custom planner loop           | Brittle — 8 failure modes, no prepareStep, regex parsing   | Use AI SDK Agent class; don't roll your own tool loop |
| TypeScript design token files | Not wired to CSS — values diverge, hardcoded in components | CSS variables + Tailwind config from day one          |
| 30-message sliding window     | Context loss in long sessions, no summarization            | Use Mastra Observational Memory for compression       |
| Regex intent parsing          | 15 hardcoded aliases, 20% failure rate on natural input    | Route via LLM; regex only for deterministic fallback  |

---

_Last updated: 2026-02-23_
_Updated during: /groom session_

# Coach Tool Development Guide

How to add, modify, and test coach tools in the Volume AI coach system.

## Architecture

```
src/lib/coach/tools/
  registry.ts     — Tool definitions and lookup
  execute.ts      — Execution pipeline (lookup → validate → run → error handling)
  schemas.ts      — Zod arg schemas
  types.ts        — ToolResult, CoachToolContext, CoachToolExecutionOptions
  helpers.ts      — Shared utilities (exerciseNotFoundResult, normalizeLookup, etc.)
  tool-*.ts       — Individual tool implementations
  tool-*.test.ts  — Tests
```

## Key Types

### ToolResult

Every tool runner returns `Promise<ToolResult>`:

```typescript
type ToolResult = {
  summary: string; // Human-readable one-liner
  blocks: CoachBlock[]; // UI blocks rendered in chat
  outputForModel: Record<string, unknown>; // Structured data returned to the LLM
};
```

### CoachToolContext

Injected by the execution pipeline:

```typescript
interface CoachToolContext {
  convex: ConvexHttpClient;
  defaultUnit: WeightUnit; // "lbs" | "kg"
  timezoneOffsetMinutes: number;
  turnId: string;
  userInput?: string;
  resolveExerciseName?: (
    name: string,
    candidates: Exercise[]
  ) => Promise<Exercise | null>;
}
```

### CoachToolExecutionOptions

Optional callbacks passed to tool runners:

```typescript
type CoachToolExecutionOptions = {
  onBlocks?: (blocks: CoachBlock[]) => void;
  skipTotals?: boolean; // Used by bulk_log to avoid N+1
};
```

## Tool Runner Signature

```typescript
type CoachToolRunner = (
  rawArgs: unknown,
  ctx: CoachToolContext,
  options?: CoachToolExecutionOptions
) => Promise<ToolResult>;
```

The `rawArgs` parameter is pre-validated by `execute.ts` using the tool's Zod schema.
Convex validates mutation/query args separately. Don't re-validate in the handler.

## Schema Registration

Schemas live in `schemas.ts`. Each schema is a Zod object.

For tools with multiple actions, use `z.discriminatedUnion("action", [...])`:

```typescript
export const QueryWorkoutsArgsSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("today_summary") }),
  z.object({
    action: z.literal("workout_session"),
    date: z.string().optional(),
  }),
]);
```

## Tool Registration

Tools are registered in `registry.ts` via `defineTool()`:

```typescript
defineTool(
  "tool_name", // Snake_case name matching the LLM tool spec
  "Description for LLM", // Guides the model on when/how to call this tool
  ArgsSchema, // Zod schema from schemas.ts
  (rawArgs, ctx, options) => runMyTool(rawArgs, ctx, options)
);
```

Two arrays exist:

- `coachToolDefinitions` — Canonical tools (new tools go here)
- `legacyCoachToolDefinitions` — Backward-compatible tools being phased out

Both are searched by `getCoachToolDefinition()`.

## Error Handling

The execution pipeline (`execute.ts`) handles:

- Unknown tool names → `unsupported_tool` error
- Zod validation failures → `invalid_tool_args` error
- Uncaught exceptions → `tool_failed` error with message

Within tool implementations:

- Use `exerciseNotFoundResult(name, errorCode, description, closeMatches)` from `helpers.ts` for all exercise-not-found errors
- Use `close_matches` from tool error output — the prompt handles disambiguation
- Don't call `get_exercise_library` to disambiguate (the prompt does this)

## New Tool Checklist

1. **Schema** — Add a Zod schema to `schemas.ts`
2. **Implementation** — Create `tool-{name}.ts` exporting a `run{Name}Tool` function matching `CoachToolRunner`
3. **Register** — Import in `registry.ts` and add to `coachToolDefinitions` via `defineTool()`
4. **Test** — Create `tool-{name}.test.ts`; mock `CoachToolContext` with a test `ConvexHttpClient`
5. **Verify** — `bun run test --run` passes; `registry.test.ts` confirms the tool is wired

The `registry.test.ts` test automatically catches orphaned tool files not imported by any other module in the tools directory.

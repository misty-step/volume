import type { ConvexHttpClient } from "convex/browser";
import { describe, expect, it, vi } from "vitest";
import { executeCoachTool, type CoachToolContext } from "./agent-tools";

function createFakeContext(options?: {
  exercises?: any[];
  todaySets?: any[];
  recentByExerciseId?: Map<string, any[]>;
  focusSuggestions?: any[];
  userInput?: string;
}) {
  const now = Date.UTC(2026, 1, 16, 12, 0, 0); // Feb 16, 2026

  const defaultExercises = [
    { _id: "ex_push", userId: "u", name: "Push-ups", createdAt: now },
    { _id: "ex_dead", userId: "u", name: "Dead Hang", createdAt: now },
  ] as any[];
  const exercises = options?.exercises ?? defaultExercises;

  const defaultTodaySets = [
    { exerciseId: "ex_push", performedAt: now - 1000, reps: 10 },
    { exerciseId: "ex_push", performedAt: now - 500, reps: 12 },
    { exerciseId: "ex_dead", performedAt: now - 200, duration: 48 },
  ] as any[];
  const todaySets = options?.todaySets ?? defaultTodaySets;

  const defaultRecentByExerciseId = new Map<string, any[]>([
    [
      "ex_push",
      [
        { exerciseId: "ex_push", performedAt: now - 10_000, reps: 10 },
        { exerciseId: "ex_push", performedAt: now - 20_000, reps: 12 },
      ],
    ],
    [
      "ex_dead",
      [
        { exerciseId: "ex_dead", performedAt: now - 10_000, duration: 48 },
        { exerciseId: "ex_dead", performedAt: now - 20_000, duration: 30 },
      ],
    ],
  ]);
  const recentByExerciseId =
    options?.recentByExerciseId ?? defaultRecentByExerciseId;

  const defaultFocusSuggestions = [
    {
      type: "exercise",
      priority: "high",
      title: "Train Pull-ups",
      reason: "You haven't trained back in a while.",
      suggestedExercises: ["Pull-ups"],
    },
  ];
  const focusSuggestions = options?.focusSuggestions ?? defaultFocusSuggestions;

  let mutationCallCount = 0;
  const convex = {
    query: vi.fn(async (_fn: unknown, args: unknown) => {
      if (args && typeof args === "object" && "includeDeleted" in args) {
        return exercises;
      }
      if (
        args &&
        typeof args === "object" &&
        "startDate" in args &&
        "endDate" in args
      ) {
        return todaySets;
      }
      if (
        args &&
        typeof args === "object" &&
        "exerciseId" in args &&
        "limit" in args
      ) {
        const exerciseId = String((args as any).exerciseId);
        return recentByExerciseId.get(exerciseId) ?? [];
      }
      if (
        args &&
        typeof args === "object" &&
        Object.keys(args as object).length === 0
      ) {
        return focusSuggestions;
      }
      throw new Error(`Unexpected query args: ${JSON.stringify(args)}`);
    }),
    mutation: vi.fn(async () => {
      mutationCallCount += 1;
      if (mutationCallCount === 1) return "set_test_id";
      if (mutationCallCount === 2) return "action_test_id";
      return null;
    }),
    action: vi.fn(async () => "ex_created"),
  } satisfies Partial<ConvexHttpClient>;

  const ctx: CoachToolContext = {
    convex: convex as ConvexHttpClient,
    defaultUnit: "lbs",
    timezoneOffsetMinutes: 0,
    turnId: "turn-test",
    userInput: options?.userInput,
  };

  return { ctx, convex, now };
}

describe("executeCoachTool", () => {
  it("supports local preference tools", async () => {
    const { ctx } = createFakeContext();

    const unit = await executeCoachTool("set_weight_unit", { unit: "kg" }, ctx);
    expect(unit.blocks.some((b) => b.type === "client_action")).toBe(true);

    const sound = await executeCoachTool("set_sound", { enabled: false }, ctx);
    expect(sound.blocks.some((b) => b.type === "client_action")).toBe(true);
  });

  it("returns an error for unsupported tools", async () => {
    const { ctx } = createFakeContext();
    const result = await executeCoachTool("nope", {}, ctx);
    expect(result.blocks[0]?.type).toBe("status");
    expect(result.outputForModel.status).toBe("error");
  });

  it("builds today's summary blocks (empty day)", async () => {
    const { ctx } = createFakeContext({ todaySets: [] });

    const result = await executeCoachTool("get_today_summary", {}, ctx);
    expect(result.blocks.some((b) => b.type === "status")).toBe(true);
    expect(result.blocks.some((b) => b.type === "suggestions")).toBe(true);
  });

  it("generates focus suggestions via analytics tool", async () => {
    const { ctx } = createFakeContext();
    const result = await executeCoachTool("get_focus_suggestions", {}, ctx);
    expect(result.blocks.some((b) => b.type === "table")).toBe(true);
    expect(result.blocks.some((b) => b.type === "suggestions")).toBe(true);
  });

  it("streams log_set blocks when onBlocks is provided", async () => {
    const { ctx } = createFakeContext();

    const streamed: any[] = [];
    const result = await executeCoachTool(
      "log_set",
      { exercise_name: "Dead Hang", duration_seconds: 48 },
      ctx,
      {
        onBlocks: (blocks) => streamed.push(blocks),
      }
    );

    expect(result.blocks.length).toBeGreaterThanOrEqual(5);
    expect(streamed.length).toBe(5);
    expect(streamed[0]?.[0]?.type).toBe("status");
    expect(streamed[0]?.[0]?.title).toContain("48 sec");
    expect(streamed[1]?.[0]).toMatchObject({
      type: "undo",
      actionId: "action_test_id",
      turnId: "turn-test",
    });
  });

  it("prefers deterministically parsed durations when userInput is available", async () => {
    const { ctx } = createFakeContext({
      userInput: "i did a dead hang for 48 seconds",
    });

    const result = await executeCoachTool(
      "log_set",
      { exercise_name: "Dead Hang", duration_seconds: 60 },
      ctx
    );

    expect(result.blocks[0]?.type).toBe("status");
    expect(result.blocks[0]?.title).toContain("48 sec");
  });

  it("builds an exercise report when the exercise exists", async () => {
    const { ctx } = createFakeContext();
    const result = await executeCoachTool(
      "get_exercise_report",
      { exercise_name: "pushups" },
      ctx
    );
    expect(result.blocks.some((b) => b.type === "trend")).toBe(true);
    expect(result.blocks.some((b) => b.type === "metrics")).toBe(true);
  });

  it("returns a helpful error when the exercise is missing", async () => {
    const { ctx } = createFakeContext({ exercises: [] });

    const result = await executeCoachTool(
      "get_exercise_report",
      { exercise_name: "mystery move" },
      ctx
    );
    expect(result.blocks[0]?.type).toBe("status");
    expect(result.outputForModel.status).toBe("error");
  });
});

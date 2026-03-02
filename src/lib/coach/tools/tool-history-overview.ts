import { format } from "date-fns";
import { api } from "@/../convex/_generated/api";
import type { Set } from "@/types/domain";
import { listExercises } from "./data";
import { formatSecondsShort } from "./helpers";
import { HistoryArgsSchema } from "./schemas";
import type { CoachToolContext, ToolResult } from "./types";

function formatWithOffset(ms: number, offset: number) {
  return format(new Date(ms - offset * 60_000), "MMM d, yyyy p");
}

function describeSet(set: Set, defaultUnit: "lbs" | "kg"): string {
  if (set.duration !== undefined) {
    return formatSecondsShort(set.duration);
  }
  const reps = set.reps ?? 0;
  if (set.weight === undefined) {
    return `${reps} reps`;
  }
  return `${reps} reps @ ${set.weight} ${set.unit ?? defaultUnit}`;
}

export async function runHistoryOverviewTool(
  rawArgs: unknown,
  ctx: CoachToolContext
): Promise<ToolResult> {
  const args = HistoryArgsSchema.parse(rawArgs);
  const limit = args.limit ?? 25;

  const [allSets, exercises] = await Promise.all([
    ctx.convex.query(api.sets.listSets, {}),
    listExercises(ctx, { includeDeleted: true }),
  ]);

  const sets = (allSets as Set[]).slice(0, limit);
  const exerciseMap = new Map(
    exercises.map((exercise) => [exercise._id, exercise])
  );

  const totalReps = sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
  const totalDuration = sets.reduce((sum, set) => sum + (set.duration ?? 0), 0);

  return {
    summary: `Loaded ${sets.length} recent sets.`,
    blocks: [
      {
        type: "detail_panel",
        title: "History snapshot",
        fields: [
          {
            label: "Recent sets shown",
            value: String(sets.length),
            emphasis: true,
          },
          { label: "Total reps", value: String(totalReps) },
          { label: "Total duration", value: formatSecondsShort(totalDuration) },
        ],
        prompts: [
          "show analytics overview",
          "show exercise library",
          "show today's summary",
        ],
      },
      {
        type: "entity_list",
        title: "Recent sets",
        emptyLabel: "No history yet. Log your first set.",
        items: sets.map((set) => {
          const exercise = exerciseMap.get(set.exerciseId);
          const when = formatWithOffset(
            set.performedAt,
            ctx.timezoneOffsetMinutes ?? 0
          );
          return {
            id: String(set._id),
            title: exercise?.name ?? "Unknown exercise",
            subtitle: `${describeSet(set, ctx.defaultUnit)} • ${when}`,
            meta: `set_id=${String(set._id)}`,
            prompt: `delete set ${String(set._id)}`,
          };
        }),
      },
    ],
    outputForModel: {
      status: "ok",
      shown_sets: sets.length,
      total_reps: totalReps,
      total_duration_seconds: totalDuration,
      set_ids: sets.map((set) => String(set._id)),
    },
  };
}

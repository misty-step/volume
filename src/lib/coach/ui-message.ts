import type { UIMessage } from "ai";
import { z } from "zod";

export const CoachTraceDataSchema = z.object({
  session_id: z.string().nullable(),
  tool_calls_count: z.number().int().min(0),
  turn_index: z.number().int().min(0),
  first_logged_exercise: z.string().nullable(),
});

export type CoachTraceData = z.infer<typeof CoachTraceDataSchema>;

export type CoachUIData = {
  coach_trace: CoachTraceData;
};

export type CoachUIMessage = UIMessage<unknown, CoachUIData>;

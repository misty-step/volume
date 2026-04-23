import type { UIMessage } from "ai";
import type { SpecDataPart } from "@json-render/core";
import { z } from "zod";

export const CoachTraceDataSchema = z.object({
  session_id: z.string().nullable(),
  tool_calls_count: z.number().int().min(0),
  turn_index: z.number().int().min(0),
  first_logged_exercise: z.string().nullable(),
});

export const CoachSpecDataSchema = z.custom<SpecDataPart>((value) =>
  Boolean(
    value &&
    typeof value === "object" &&
    "type" in value &&
    (value.type === "patch" || value.type === "flat" || value.type === "nested")
  )
);

export type CoachTraceData = z.infer<typeof CoachTraceDataSchema>;

export type CoachUIData = {
  coach_trace: CoachTraceData;
  spec: SpecDataPart;
};

export type CoachUIMessage = UIMessage<unknown, CoachUIData>;

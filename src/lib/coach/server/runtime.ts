import OpenAI from "openai";

const DEFAULT_COACH_MODEL =
  process.env.COACH_AGENT_MODEL ?? "minimax/minimax-m2.5";

export type PlannerRuntime = { client: OpenAI; model: string };

export function getCoachRuntime(): PlannerRuntime | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return null;
  }

  return {
    client: new OpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://volume.fitness",
        "X-Title": "Volume Coach",
      },
    }),
    model: DEFAULT_COACH_MODEL,
  };
}

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Ordered fallback chains per role. Primary is index 0; each subsequent
 * model is tried on failure. Provider diversity ensures uncorrelated outages.
 *
 * Chain rationale (April 2026):
 *   Gemini 3 Flash   — 78% SWE-bench, near-Pro quality, 1M ctx, strong tool calling
 *   GPT-5.4 Mini     — OSWorld 72.2%, strongest budget agentic model, excellent instruction following
 *   MiniMax M2.7     — 86.2% PinchBench (near Opus), agentic-tuned, GA
 */
export const MODEL_CHAINS = {
  COACH: [
    "google/gemini-3-flash-preview",
    "openai/gpt-5.4-mini",
    "minimax/minimax-m2.7",
  ],
  CLASSIFICATION: ["google/gemini-3-flash-preview"],
} as const;

// Flat aliases derived from chains — keeps existing consumers working.
export const MODELS = {
  MAIN: MODEL_CHAINS.COACH[0],
  CLASSIFICATION: MODEL_CHAINS.CLASSIFICATION[0],
  WRITER: MODEL_CHAINS.COACH[0],
  FALLBACK: MODEL_CHAINS.COACH[MODEL_CHAINS.COACH.length - 1],
} as const;

export const ROUTING_POLICY = {
  COACH: MODELS.MAIN,
  CLASSIFICATION: MODELS.CLASSIFICATION,
  WRITER: MODELS.WRITER,
  FALLBACK: MODELS.FALLBACK,
} as const;

export const RUNTIME_CONFIG = {
  apiKeyEnvVar: "OPENROUTER_API_KEY",
  coachModelOverrideEnvVar: "COACH_AGENT_MODEL",
  referer: "https://volume.fitness",
  appTitle: "Volume",
  coachAppTitle: "Volume Coach",
  timeoutMs: 30_000,
} as const;

export const PRICING = {
  "google/gemini-3-flash-preview": {
    inputPerMillion: 0.5,
    outputPerMillion: 3.0,
  },
  "openai/gpt-5.4-mini": {
    inputPerMillion: 0.75,
    outputPerMillion: 4.5,
  },
  "minimax/minimax-m2.7": {
    inputPerMillion: 0.3,
    outputPerMillion: 1.2,
  },
} as const;

export type OpenRouterModelId = (typeof MODELS)[keyof typeof MODELS];

type CoachChainModel = (typeof MODEL_CHAINS.COACH)[number];
type ClassificationChainModel = (typeof MODEL_CHAINS.CLASSIFICATION)[number];
type AllChainModels = CoachChainModel | ClassificationChainModel;

// Compile-time check: every model across all chains must have a PRICING entry.
// Using `satisfies` on a concrete value so TypeScript actually evaluates the constraint.
const _pricingCoversAllModels: Record<AllChainModels, unknown> = PRICING;

export function getOpenRouterApiKey(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const apiKey = env[RUNTIME_CONFIG.apiKeyEnvVar]?.trim();
  return apiKey ? apiKey : null;
}

export function isOpenRouterConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return getOpenRouterApiKey(env) !== null;
}

/**
 * Resolve the coach model chain. An env override replaces the entire chain
 * with a single model (useful for A/B testing a specific model).
 */
export function resolveCoachModelChain(
  env: NodeJS.ProcessEnv = process.env
): readonly string[] {
  const override = env[RUNTIME_CONFIG.coachModelOverrideEnvVar]?.trim();
  return override ? [override] : MODEL_CHAINS.COACH;
}

/** @deprecated Use resolveCoachModelChain instead */
export function resolveCoachModelId(
  env: NodeJS.ProcessEnv = process.env
): string {
  // Chain is always non-empty: override produces [override], default has 3 models.
  return resolveCoachModelChain(env)[0]!;
}

export function getOpenRouterHeaders(
  title: string = RUNTIME_CONFIG.appTitle
): Record<string, string> {
  return {
    "HTTP-Referer": RUNTIME_CONFIG.referer,
    "X-Title": title,
  };
}

export function getCoachRuntimeHealthMetadata(
  env: NodeJS.ProcessEnv = process.env
) {
  const chain = resolveCoachModelChain(env);
  return {
    defaultModel: ROUTING_POLICY.COACH,
    configuredModel: chain[0],
    modelChain: chain,
    apiKeyEnvVar: RUNTIME_CONFIG.apiKeyEnvVar,
    modelOverrideEnvVar: RUNTIME_CONFIG.coachModelOverrideEnvVar,
  };
}

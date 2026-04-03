export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Ordered fallback chains per role. Primary is index 0; each subsequent
 * model is tried on failure. Provider diversity ensures uncorrelated outages.
 *
 * Chain rationale (April 2026):
 *   Qwen 3.5 Flash  — 97.5% tool-calling pass rate, $0.065/$0.26, 1M ctx
 *   MiniMax M2.7     — 86.2% PinchBench (near Opus), agentic-tuned, GA
 *   Gemini 3 Flash   — 78% SWE-bench, near-Pro quality, 1M ctx
 */
export const MODEL_CHAINS = {
  COACH: [
    "qwen/qwen3.5-flash-02-23",
    "minimax/minimax-m2.7",
    "google/gemini-3-flash-preview",
  ],
  CLASSIFICATION: ["qwen/qwen3.5-flash-02-23"],
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
  "qwen/qwen3.5-flash-02-23": {
    inputPerMillion: 0.065,
    outputPerMillion: 0.26,
  },
  "minimax/minimax-m2.7": {
    inputPerMillion: 0.3,
    outputPerMillion: 1.2,
  },
  "google/gemini-3-flash-preview": {
    inputPerMillion: 0.5,
    outputPerMillion: 3.0,
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

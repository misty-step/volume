export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const MODELS = {
  MAIN: "anthropic/claude-sonnet-4.6",
  CLASSIFICATION: "minimax/minimax-m2.5",
  WRITER: "moonshotai/kimi-k2.5",
  FALLBACK: "z-ai/glm-5",
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
  [MODELS.MAIN]: {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  [MODELS.CLASSIFICATION]: {
    inputPerMillion: 0.3,
    outputPerMillion: 1.2,
  },
  [MODELS.WRITER]: {
    inputPerMillion: 0.23,
    outputPerMillion: 3.0,
  },
  [MODELS.FALLBACK]: {
    inputPerMillion: 0.3,
    outputPerMillion: 2.55,
  },
} as const;

export type OpenRouterModelId = (typeof MODELS)[keyof typeof MODELS];

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

export function resolveCoachModelId(
  env: NodeJS.ProcessEnv = process.env
): string {
  const override = env[RUNTIME_CONFIG.coachModelOverrideEnvVar]?.trim();
  return override ? override : ROUTING_POLICY.COACH;
}

export function getOpenRouterHeaders(
  title: string = RUNTIME_CONFIG.appTitle
): Record<string, string> {
  return {
    "HTTP-Referer": RUNTIME_CONFIG.referer,
    "X-Title": title,
  };
}

export function getCoachRuntimeMetadata(env: NodeJS.ProcessEnv = process.env) {
  return {
    defaultModel: ROUTING_POLICY.COACH,
    configuredModel: resolveCoachModelId(env),
    classificationModel: ROUTING_POLICY.CLASSIFICATION,
    writerModel: ROUTING_POLICY.WRITER,
    fallbackModel: ROUTING_POLICY.FALLBACK,
    apiKeyEnvVar: RUNTIME_CONFIG.apiKeyEnvVar,
    modelOverrideEnvVar: RUNTIME_CONFIG.coachModelOverrideEnvVar,
    timeoutMs: RUNTIME_CONFIG.timeoutMs,
  };
}

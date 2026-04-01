export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const MODELS = {
  MAIN: "google/gemini-3.1-flash-lite-preview",
  CLASSIFICATION: "google/gemini-3.1-flash-lite-preview",
  WRITER: "google/gemini-3.1-flash-lite-preview",
  FALLBACK: "google/gemini-3.1-flash-lite-preview",
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
    inputPerMillion: 0.25,
    outputPerMillion: 1.5,
  },
} as const;

export type OpenRouterModelId = (typeof MODELS)[keyof typeof MODELS];

// Compile-time check: every distinct model string in MODELS must have a PRICING
// entry. Adding a new model without pricing triggers a type error here.
type _AssertPricingComplete = {
  [K in OpenRouterModelId]: K extends keyof typeof PRICING ? true : never;
};

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

export function getCoachRuntimeHealthMetadata(
  env: NodeJS.ProcessEnv = process.env
) {
  return {
    defaultModel: ROUTING_POLICY.COACH,
    configuredModel: resolveCoachModelId(env),
    apiKeyEnvVar: RUNTIME_CONFIG.apiKeyEnvVar,
    modelOverrideEnvVar: RUNTIME_CONFIG.coachModelOverrideEnvVar,
  };
}

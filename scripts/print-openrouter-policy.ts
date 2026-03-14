import { RUNTIME_CONFIG } from "@/lib/openrouter/policy";

console.log(`OPENROUTER_API_KEY_VAR=${RUNTIME_CONFIG.apiKeyEnvVar}`);
console.log(
  `OPENROUTER_COACH_MODEL_OVERRIDE_VAR=${RUNTIME_CONFIG.coachModelOverrideEnvVar}`
);

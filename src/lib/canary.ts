import type { InitOptions } from "@canary-obs/sdk";

export type CanaryTarget = "client" | "server";
export type ServerCanaryConfigSource = "dedicated" | "public_fallback";

type EnvSource = NodeJS.ProcessEnv;

function readNonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getPublicCanaryConfig(env: EnvSource) {
  const endpoint = readNonEmpty(env.NEXT_PUBLIC_CANARY_ENDPOINT);
  const apiKey = readNonEmpty(env.NEXT_PUBLIC_CANARY_API_KEY);

  if (!endpoint || !apiKey) {
    return null;
  }

  return { endpoint, apiKey };
}

function getDedicatedServerCanaryConfig(env: EnvSource) {
  const endpoint = readNonEmpty(env.CANARY_ENDPOINT);
  const apiKey = readNonEmpty(env.CANARY_API_KEY);

  if (!endpoint || !apiKey) {
    return null;
  }

  return { endpoint, apiKey };
}

export function getServerCanaryConfigSource(
  env: EnvSource = process.env
): ServerCanaryConfigSource | null {
  if (getDedicatedServerCanaryConfig(env)) {
    return "dedicated";
  }

  if (getPublicCanaryConfig(env)) {
    return "public_fallback";
  }

  return null;
}

export function getCanaryInitOptions(
  target: CanaryTarget,
  env: EnvSource = process.env
): InitOptions | null {
  const config =
    target === "server"
      ? (getDedicatedServerCanaryConfig(env) ?? getPublicCanaryConfig(env))
      : getPublicCanaryConfig(env);

  if (!config) {
    return null;
  }

  return {
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    service: "volume",
    environment: env.NODE_ENV ?? "production",
    scrubPii: true,
  };
}

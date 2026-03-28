import type { InitOptions } from "@canary-obs/sdk";

export type CanaryTarget = "client" | "server";

type EnvSource = NodeJS.ProcessEnv;

function readNonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getCanaryInitOptions(
  target: CanaryTarget,
  env: EnvSource = process.env
): InitOptions | null {
  const endpoint =
    target === "server"
      ? (readNonEmpty(env.CANARY_ENDPOINT) ??
        readNonEmpty(env.NEXT_PUBLIC_CANARY_ENDPOINT))
      : readNonEmpty(env.NEXT_PUBLIC_CANARY_ENDPOINT);
  const apiKey =
    target === "server"
      ? (readNonEmpty(env.CANARY_API_KEY) ??
        readNonEmpty(env.NEXT_PUBLIC_CANARY_API_KEY))
      : readNonEmpty(env.NEXT_PUBLIC_CANARY_API_KEY);

  if (!endpoint || !apiKey) {
    return null;
  }

  return {
    endpoint,
    apiKey,
    service: "volume",
    environment: env.NODE_ENV ?? "production",
    scrubPii: true,
  };
}

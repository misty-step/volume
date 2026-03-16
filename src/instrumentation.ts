import { initCanary } from "@canary-obs/sdk";

export { onRequestError } from "@canary-obs/sdk/nextjs";

export function register() {
  if (process.env.CANARY_ENDPOINT && process.env.CANARY_API_KEY) {
    initCanary({
      endpoint: process.env.CANARY_ENDPOINT,
      apiKey: process.env.CANARY_API_KEY,
      service: "volume",
      environment: process.env.NODE_ENV ?? "production",
      scrubPii: true,
    });
  }
}

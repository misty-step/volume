import { captureCanaryException } from "@/lib/canary";

export function register() {
  // Canary does not require eager initialization.
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string> }
): Promise<void> {
  await captureCanaryException(error, {
    context: {
      source: "nextjs.onRequestError",
      path: request.path,
      method: request.method,
    },
  });
}

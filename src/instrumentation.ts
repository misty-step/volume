import { initCanary } from "@canary-obs/sdk";
import { getCanaryInitOptions } from "@/lib/canary";

export { onRequestError } from "@canary-obs/sdk/nextjs";

export function register() {
  const options = getCanaryInitOptions("server");
  if (options) {
    initCanary(options);
  }
}

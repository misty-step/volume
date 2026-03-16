import { CaptureOptions } from './index.js';

interface RequestInfo {
    path: string;
    method: string;
    headers: Record<string, string>;
}
/**
 * Next.js instrumentation hook. Export from `instrumentation.ts`:
 *
 *   export { onRequestError } from "@canary-obs/sdk/nextjs";
 */
declare function onRequestError(error: unknown, request: RequestInfo, opts?: CaptureOptions): Promise<void>;

export { type RequestInfo, onRequestError };

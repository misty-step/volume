interface CanaryResponse {
    id: string;
    group_hash: string;
    is_new_class: boolean;
}

interface ScrubRule {
    pattern: RegExp;
    replacement: string;
}

interface InitOptions {
    endpoint: string;
    apiKey: string;
    service: string;
    environment?: string;
    scrubPii?: boolean;
    scrubRules?: ScrubRule[];
}
interface CaptureOptions {
    severity?: "error" | "warning" | "info";
    context?: Record<string, unknown>;
    fingerprint?: string[];
}
declare function initCanary(opts: InitOptions): void;
declare function captureException(error: unknown, opts?: CaptureOptions): Promise<CanaryResponse | null>;
declare function captureMessage(message: string, opts?: CaptureOptions): Promise<CanaryResponse | null>;

export { type CanaryResponse, type CaptureOptions, type InitOptions, type ScrubRule, captureException, captureMessage, initCanary };

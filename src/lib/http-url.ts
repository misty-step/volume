export type HttpUrlInspection =
  | { kind: "missing" }
  | {
      kind: "invalid";
      input: string;
      reason: "unparseable" | "missing_hostname" | "unsupported_protocol";
      protocol?: string;
    }
  | { kind: "valid"; input: string; url: URL };

export function inspectHttpUrl(value: string | undefined): HttpUrlInspection {
  const trimmed = value?.trim();
  if (!trimmed) return { kind: "missing" };

  if (!URL.canParse(trimmed)) {
    return {
      kind: "invalid",
      input: trimmed,
      reason: "unparseable",
    };
  }

  const url = new URL(trimmed);
  if (!url.hostname) {
    return {
      kind: "invalid",
      input: trimmed,
      reason: "missing_hostname",
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      kind: "invalid",
      input: trimmed,
      reason: "unsupported_protocol",
      protocol: url.protocol,
    };
  }

  return { kind: "valid", input: trimmed, url };
}

export function readHttpUrl(value: string | undefined): string | undefined {
  const inspection = inspectHttpUrl(value);
  return inspection.kind === "valid" ? inspection.input : undefined;
}

export function hasInvalidHttpUrl(value: string | undefined): boolean {
  return inspectHttpUrl(value).kind === "invalid";
}

import { mockAnalyticsState } from "./mock";
import { AnalyticsEventName } from "../events";

function deepEquals(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      return a.every((v, i) => deepEquals(v, b[i]));
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => deepEquals(a[k], b[k]));
  }
  return false;
}

export function expectAnalyticsEvent(
  name: AnalyticsEventName,
  matcher?: Record<string, unknown>
) {
  const match = mockAnalyticsState.events.find((event) => {
    if (event.name !== name) return false;
    if (!matcher) return true;
    return Object.entries(matcher).every(([key, value]) =>
      deepEquals(event.props[key], value)
    );
  });

  if (!match) {
    const seen = mockAnalyticsState.events
      .map((e) => `${e.name} ${JSON.stringify(e.props)}`)
      .join("\n- ");
    throw new Error(
      `Expected analytics event "${name}"${
        matcher ? ` with props ${JSON.stringify(matcher)}` : ""
      }.\nCaptured events:\n- ${seen || "(none)"}`
    );
  }

  return match;
}

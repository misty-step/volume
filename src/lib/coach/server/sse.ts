import type { CoachStreamEvent } from "@/lib/coach/schema";

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

// Padding helps defeat proxy buffering so tool_result events render progressively.
export const SSE_PADDING_BYTES = 2048;

export function wantsEventStream(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/event-stream");
}

export function encodeSse(event: CoachStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function encodeSseComment(content: string): string {
  return `:${content}\n\n`;
}

// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readCoachStreamEvents } from "@/lib/coach/sse-client";

function createStreamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

async function collectEvents(body: ReadableStream<Uint8Array>) {
  const events: any[] = [];
  for await (const event of readCoachStreamEvents(body)) {
    events.push(event);
  }
  return events;
}

describe("readCoachStreamEvents", () => {
  it("parses valid SSE frames", async () => {
    const body = createStreamFromChunks([
      "event: start\n",
      'data: {"type":"start","model":"test"}\n\n',
      "event: final\n",
      'data: {"type":"final","response":{"assistantText":"ok","blocks":[],"trace":{"toolsUsed":[],"model":"m","fallbackUsed":false}}}\n\n',
    ]);

    const events = await collectEvents(body);
    expect(events.map((e) => e.type)).toEqual(["start", "final"]);
  });

  it("handles chunk boundaries mid-frame", async () => {
    const body = createStreamFromChunks([
      "event: tool_result\n",
      "data: {",
      '"type":"tool_result","toolName":"log_set","blocks":[]',
      "}\n\n",
    ]);

    const events = await collectEvents(body);
    expect(events).toEqual([
      { type: "tool_result", toolName: "log_set", blocks: [] },
    ]);
  });

  it("emits an error on malformed JSON", async () => {
    const body = createStreamFromChunks([
      "event: start\n",
      "data: {not-json}\n\n",
    ]);

    const events = await collectEvents(body);
    expect(events).toEqual([
      { type: "error", message: "Malformed stream event received." },
    ]);
  });

  it("emits an error on schema validation failure", async () => {
    const body = createStreamFromChunks([
      "event: start\n",
      'data: {"type":"start"}\n\n',
    ]);

    const events = await collectEvents(body);
    expect(events).toEqual([
      { type: "error", message: "Invalid stream event received." },
    ]);
  });
});

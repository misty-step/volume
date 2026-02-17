import {
  CoachStreamEventSchema,
  type CoachStreamEvent,
} from "@/lib/coach/schema";

type SseFrame = {
  event: string;
  data: string;
};

async function* readSseFrames(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<SseFrame, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const boundary = buffer.indexOf("\n\n");
        if (boundary === -1) break;

        const rawFrame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (!rawFrame.trim()) continue;

        let eventName = "message";
        const dataLines: string[] = [];
        for (const line of rawFrame.split(/\r?\n/)) {
          if (line.startsWith("event:")) {
            eventName = line.slice("event:".length).trim() || eventName;
            continue;
          }
          if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trimStart());
          }
        }

        yield { event: eventName, data: dataLines.join("\n") };
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore releaseLock races
    }
  }
}

export async function* readCoachStreamEvents(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<CoachStreamEvent, void, void> {
  for await (const frame of readSseFrames(body)) {
    if (!frame.data) continue;

    let parsedEvent: unknown;
    try {
      parsedEvent = JSON.parse(frame.data);
    } catch {
      continue;
    }

    const eventResult = CoachStreamEventSchema.safeParse(parsedEvent);
    if (!eventResult.success) continue;
    yield eventResult.data;
  }
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { useTactileSoundPreference } from "@/hooks/useTactileSoundPreference";
import { formatDuration } from "@/lib/date-utils";
import {
  CoachStreamEventSchema,
  CoachTurnResponseSchema,
  DEFAULT_COACH_SUGGESTIONS,
  type CoachBlock,
  type CoachMessageInput,
} from "@/lib/coach/schema";

type CoachTimelineMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  blocks?: CoachBlock[];
};

type SseFrame = {
  event: string;
  data: string;
};

const MAX_COACH_MESSAGES = 24;

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

const createId = (() => {
  let counter = 0;
  return (): string => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    counter += 1;
    return `fallback-id-${Date.now()}-${counter}`;
  };
})();

function trimCoachConversation(
  messages: CoachMessageInput[]
): CoachMessageInput[] {
  if (messages.length <= MAX_COACH_MESSAGES) return messages;
  const slice = messages.slice(messages.length - MAX_COACH_MESSAGES);
  if (slice.length > 1 && slice[0]?.role === "assistant") return slice.slice(1);
  return slice;
}

function toolProgressText(toolName: string): string {
  if (toolName === "log_set") return "Logging your set...";
  if (toolName === "get_today_summary") return "Summarizing today...";
  if (toolName === "get_exercise_report")
    return "Analyzing exercise history...";
  if (toolName === "get_focus_suggestions")
    return "Building today's focus plan...";
  if (toolName === "set_weight_unit") return "Updating settings...";
  if (toolName === "set_sound") return "Updating settings...";
  return "Working...";
}

function statusToneClasses(tone: "success" | "error" | "info"): string {
  if (tone === "success") return "border-l-4 border-l-green-500";
  if (tone === "error") return "border-l-4 border-l-danger-red";
  return "border-l-4 border-l-safety-orange";
}

function formatMetricTotal(metric: "reps" | "duration", value: number): string {
  if (metric === "reps") return `${value} reps`;
  if (value < 60) return `${value} sec`;
  if (value % 60 === 0) return `${value / 60} min`;
  return formatDuration(value);
}

function renderTrendBars(
  points: Array<{ date: string; label: string; value: number }>,
  bestDay: number
) {
  const safeBest = Math.max(bestDay, 1);
  return (
    <div className="mt-3">
      <div className="h-28 flex items-end gap-1">
        {points.map((point) => {
          const height = Math.max(
            (point.value / safeBest) * 100,
            point.value > 0 ? 8 : 4
          );
          return (
            <div
              key={point.date}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-sm bg-safety-orange/80 transition-[height] duration-200"
                style={{ height: `${height}%` }}
                title={`${point.label}: ${point.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-mono uppercase">
        <span>{points[0]?.label ?? ""}</span>
        <span>{points[points.length - 1]?.label ?? ""}</span>
      </div>
    </div>
  );
}

function BlockRenderer({
  block,
  onPrompt,
}: {
  block: CoachBlock;
  onPrompt: (prompt: string) => void;
}) {
  if (block.type === "client_action") {
    return null;
  }

  if (block.type === "status") {
    return (
      <div
        className={`rounded-md border bg-background px-3 py-2 ${statusToneClasses(block.tone)}`}
      >
        <p className="text-sm font-semibold">{block.title}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {block.description}
        </p>
      </div>
    );
  }

  if (block.type === "metrics") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{block.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {block.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded border bg-muted/30 px-3 py-2"
              >
                <p className="text-[10px] uppercase font-mono text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-sm font-semibold mt-1">{metric.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (block.type === "trend") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-safety-orange" />
            {block.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{block.subtitle}</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">14-day total</span>
            <span className="font-semibold">
              {formatMetricTotal(block.metric, block.total)}
            </span>
          </div>
          {renderTrendBars(block.points, block.bestDay)}
        </CardContent>
      </Card>
    );
  }

  if (block.type === "table") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{block.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {block.rows.map((row, idx) => (
            <div
              key={`${row.label}-${row.value}-${idx}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div>
                <p className="font-medium">{row.label}</p>
                {row.meta ? (
                  <p className="text-xs text-muted-foreground">{row.meta}</p>
                ) : null}
              </div>
              <p className="font-semibold text-right">{row.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {block.prompts.map((prompt) => (
        <Button
          key={prompt}
          size="sm"
          variant="outline"
          onClick={() => onPrompt(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}

export function CoachPrototype() {
  const { unit, setUnit } = useWeightUnit();
  const { soundEnabled, setSoundEnabled } = useTactileSoundPreference();

  const [timeline, setTimeline] = useState<CoachTimelineMessage[]>([
    {
      id: createId(),
      role: "assistant",
      text: "Coach agent online. Ask in natural language and I will decide tools dynamically.",
      blocks: [
        {
          type: "status",
          tone: "info",
          title: "Planner-first mode",
          description:
            "Model picks tools, tools execute deterministically, UI renders typed blocks.",
        },
        {
          type: "suggestions",
          prompts: DEFAULT_COACH_SUGGESTIONS,
        },
      ],
    },
  ]);
  const [conversation, setConversation] = useState<CoachMessageInput[]>([]);
  const [input, setInput] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [lastTrace, setLastTrace] = useState<{
    model: string;
    toolsUsed: string[];
    fallbackUsed: boolean;
  } | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline, isWorking]);

  function applyClientActions(blocks: CoachBlock[]) {
    for (const block of blocks) {
      if (
        block.type === "client_action" &&
        block.action === "set_weight_unit"
      ) {
        if (block.payload.unit === "lbs" || block.payload.unit === "kg") {
          setUnit(block.payload.unit);
        }
      }
      if (block.type === "client_action" && block.action === "set_sound") {
        if (typeof block.payload.enabled === "boolean") {
          setSoundEnabled(block.payload.enabled);
        }
      }
    }
  }

  async function sendPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || isWorking) return;

    const timezoneOffsetMinutes = new Date().getTimezoneOffset();
    const assistantId = createId();
    const userMessage: CoachTimelineMessage = {
      id: createId(),
      role: "user",
      text: trimmed,
    };

    const nextConversation = trimCoachConversation([
      ...conversation,
      { role: "user", content: trimmed },
    ]);

    setTimeline((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        text: "…",
        blocks: [],
      },
    ]);
    setConversation(nextConversation);
    setInput("");
    setIsWorking(true);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: nextConversation,
          preferences: {
            unit,
            soundEnabled,
            timezoneOffsetMinutes,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Coach API failed (${response.status})`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        if (!response.body) {
          throw new Error("Missing streaming response body");
        }

        for await (const frame of readSseFrames(response.body)) {
          if (!frame.data) continue;

          let parsedEvent: unknown;
          try {
            parsedEvent = JSON.parse(frame.data);
          } catch {
            continue;
          }

          const eventResult = CoachStreamEventSchema.safeParse(parsedEvent);
          if (!eventResult.success) continue;
          const event = eventResult.data;

          if (event.type === "tool_start") {
            setTimeline((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, text: toolProgressText(event.toolName) }
                  : message
              )
            );
          }

          if (event.type === "tool_result") {
            applyClientActions(event.blocks);
            setTimeline((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      blocks: [...(message.blocks ?? []), ...event.blocks],
                    }
                  : message
              )
            );
          }

          if (event.type === "final") {
            const payload = CoachTurnResponseSchema.parse(event.response);
            applyClientActions(payload.blocks);
            setLastTrace(payload.trace);
            setConversation([
              ...nextConversation,
              { role: "assistant", content: payload.assistantText },
            ]);
            setTimeline((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      text: payload.assistantText,
                      blocks: payload.blocks,
                    }
                  : message
              )
            );
            break;
          }
        }
      } else {
        const payload = CoachTurnResponseSchema.parse(await response.json());
        applyClientActions(payload.blocks);
        setLastTrace(payload.trace);
        setConversation([
          ...nextConversation,
          { role: "assistant", content: payload.assistantText },
        ]);
        setTimeline((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  text: payload.assistantText,
                  blocks: payload.blocks,
                }
              : message
          )
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setConversation([
        ...nextConversation,
        {
          role: "assistant",
          content: "I hit an error while planning this turn.",
        },
      ]);
      setTimeline((prev) =>
        prev.map((entry) =>
          entry.id === assistantId
            ? {
                ...entry,
                text: "I hit an error while planning this turn.",
                blocks: [
                  {
                    type: "status",
                    tone: "error",
                    title: "Planning failed",
                    description: message,
                  },
                  {
                    type: "suggestions",
                    prompts: DEFAULT_COACH_SUGGESTIONS,
                  },
                ],
              }
            : entry
        )
      );
    } finally {
      setIsWorking(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(input);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 space-y-4">
      <Card className="border-safety-orange">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-safety-orange" />
            Agent Coach
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Model chooses actions. Tools execute deterministically. UI blocks
            stay typed.
          </p>
          <p className="text-xs text-muted-foreground">
            Local prefs: {unit.toUpperCase()} unit, tactile sounds{" "}
            {soundEnabled ? "on" : "off"}
          </p>
          {lastTrace ? (
            <p className="text-[10px] text-muted-foreground font-mono">
              model={lastTrace.model} tools=[
              {lastTrace.toolsUsed.join(", ") || "none"}] fallback=
              {lastTrace.fallbackUsed ? "yes" : "no"}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {timeline.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            <div
              className={`max-w-[92%] rounded-lg border px-4 py-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-card-foreground"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              {message.blocks && message.blocks.length > 0 ? (
                <div className="space-y-3 mt-3">
                  {message.blocks.map((block, index) => (
                    <BlockRenderer
                      key={`${message.id}-${block.type}-${index}`}
                      block={block}
                      onPrompt={(prompt) => {
                        void sendPrompt(prompt);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {isWorking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Coach is planning...
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={'Try: "What should I work on today?"'}
          disabled={isWorking}
        />
        <Button type="submit" disabled={isWorking || input.trim().length === 0}>
          Send
        </Button>
      </form>
    </main>
  );
}

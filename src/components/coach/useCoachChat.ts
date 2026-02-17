"use client";

import { useEffect, useRef, useState } from "react";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { useTactileSoundPreference } from "@/hooks/useTactileSoundPreference";
import { readCoachStreamEvents } from "@/lib/coach/sse-client";
import {
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

const MAX_COACH_MESSAGES = 24;

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

export function useCoachChat() {
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
        block.action === "set_weight_unit" &&
        "unit" in block.payload
      ) {
        if (block.payload.unit === "lbs" || block.payload.unit === "kg") {
          setUnit(block.payload.unit);
        }
      }
      if (
        block.type === "client_action" &&
        block.action === "set_sound" &&
        "enabled" in block.payload
      ) {
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
        let detail = "";
        try {
          const data = (await response.json()) as unknown;
          if (data && typeof data === "object" && "error" in data) {
            detail = String((data as { error: unknown }).error);
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(
          detail
            ? `Coach API failed (${response.status}): ${detail}`
            : `Coach API failed (${response.status})`
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        if (!response.body) {
          throw new Error("Missing streaming response body");
        }

        let streamedError = false;
        for await (const event of readCoachStreamEvents(response.body)) {
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

          if (event.type === "error" && !streamedError) {
            streamedError = true;
            setTimeline((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      blocks: [
                        ...(message.blocks ?? []),
                        {
                          type: "status",
                          tone: "error",
                          title: "Stream error",
                          description: event.message,
                        },
                      ],
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

        return;
      }

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

  return {
    input,
    setInput,
    isWorking,
    lastTrace,
    timeline,
    unit,
    soundEnabled,
    endRef,
    sendPrompt,
  };
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { useJsonRenderMessage } from "@json-render/react";
import { DefaultChatTransport } from "ai";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { useTactileSoundPreference } from "@/hooks/useTactileSoundPreference";
import { trackEvent, reportError } from "@/lib/analytics";

function parseAgentActionId(actionId: string): Id<"agentActions"> | null {
  const trimmed = actionId.trim();
  if (!trimmed) return null;
  return trimmed as Id<"agentActions">;
}

export function useCoachChat() {
  const router = useRouter();
  const { unit, setUnit } = useWeightUnit();
  const { soundEnabled, setSoundEnabled } = useTactileSoundPreference();
  const getOrCreateTodaySession = useMutation(
    api.coachSessions.getOrCreateTodaySession
  );
  const undoAgentActionMutation = useMutation(api.agentActions.undoAgentAction);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const sessionBootstrapRef = useRef<Promise<string | null> | null>(null);
  const sessionDateRef = useRef<string | null>(null);
  const processedActionsRef = useRef(new Set<string>());
  const endRef = useRef<HTMLDivElement>(null);

  async function ensureSessionId(): Promise<string | null> {
    const today = new Date().toDateString();
    if (sessionId && sessionDateRef.current === today) {
      return sessionId;
    }

    if (!sessionBootstrapRef.current) {
      sessionBootstrapRef.current = getOrCreateTodaySession({
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      })
        .then((result) => {
          const nextSessionId = result.session._id as string;
          setSessionId(nextSessionId);
          sessionDateRef.current = new Date().toDateString();
          return nextSessionId;
        })
        .catch((error) => {
          const err = error instanceof Error ? error : new Error(String(error));
          reportError(err, {
            component: "useCoachChat",
            operation: "bootstrapSession",
          });
          return null;
        })
        .finally(() => {
          sessionBootstrapRef.current = null;
        });
    }

    return await sessionBootstrapRef.current;
  }

  useEffect(() => {
    void ensureSessionId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable transport instance — must NOT be recreated on every render.
  // Session/preference data is passed per-request via sendMessage body.
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/coach" }),
    []
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (error) => {
      reportError(error instanceof Error ? error : new Error(String(error)), {
        component: "useCoachChat",
        operation: "useChat",
      });
    },
  });

  const isWorking = status === "streaming" || status === "submitted";

  // Extract json-render spec from the latest assistant message.
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const { spec } = useJsonRenderMessage(lastAssistantMessage?.parts ?? []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWorking]);

  // Process client actions from spec elements (deduplicated by element key).
  useEffect(() => {
    if (!spec?.elements) return;
    for (const [key, element] of Object.entries(spec.elements)) {
      if (element.type !== "ClientAction") continue;
      if (processedActionsRef.current.has(key)) continue;
      processedActionsRef.current.add(key);

      const props = element.props as {
        action: string;
        payload: Record<string, unknown>;
      };
      if (
        props.action === "set_weight_unit" &&
        "unit" in props.payload &&
        (props.payload.unit === "lbs" || props.payload.unit === "kg")
      ) {
        setUnit(props.payload.unit);
      }
      if (
        props.action === "set_sound" &&
        "enabled" in props.payload &&
        typeof props.payload.enabled === "boolean"
      ) {
        setSoundEnabled(props.payload.enabled);
      }
      if (props.action === "open_checkout") {
        router.push("/pricing");
      }
      if (props.action === "open_billing_portal") {
        void (async () => {
          try {
            const response = await fetch("/api/stripe/portal", {
              method: "POST",
            });
            const data = (await response.json()) as {
              url?: string;
              error?: string;
            };
            if (response.ok && data.url) {
              window.location.href = data.url;
            }
          } catch {
            // Portal errors are non-critical
          }
        })();
      }
    }
  }, [spec, setUnit, setSoundEnabled, router]);

  async function sendPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || isWorking) return;

    await ensureSessionId();
    trackEvent("Coach Message Sent", {
      messageLength: trimmed.length,
      turnIndex: messages.length,
    });

    await sendMessage(
      { text: trimmed },
      {
        body: {
          sessionId,
          preferences: {
            unit,
            soundEnabled,
            timezoneOffsetMinutes: new Date().getTimezoneOffset(),
          },
        },
      }
    );
    setInput("");
  }

  async function undoAction(actionId: string, turnId: string) {
    void turnId;
    const parsedActionId = parseAgentActionId(actionId);
    if (!parsedActionId) return;

    try {
      await undoAgentActionMutation({ actionId: parsedActionId });
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)), {
        component: "useCoachChat",
        operation: "undoAction",
      });
    }
  }

  async function runClientAction(
    action: "open_checkout" | "open_billing_portal"
  ) {
    if (action === "open_checkout") {
      router.push("/pricing");
      return;
    }
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (response.ok && data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Handled by error boundary
    }
  }

  return {
    input,
    setInput,
    isWorking,
    messages,
    spec,
    unit,
    soundEnabled,
    endRef,
    sendPrompt,
    undoAction,
    runClientAction,
  };
}

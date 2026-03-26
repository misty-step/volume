"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { useTactileSoundPreference } from "@/hooks/useTactileSoundPreference";
import { trackEvent, reportError } from "@/lib/analytics";

type JsonRenderActionHandler = (
  params: Record<string, unknown>
) => Promise<unknown> | unknown;

function parseAgentActionId(actionId: string): Id<"agentActions"> | null {
  const trimmed = actionId.trim();
  if (!trimmed) return null;
  return trimmed as Id<"agentActions">;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asOptionalTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildQuickLogPrompt(params: unknown): string | null {
  const record = asRecord(params);
  const exerciseName = asOptionalTrimmedString(record?.exerciseName);
  const reps = asOptionalTrimmedString(record?.reps);
  const durationSeconds = asOptionalTrimmedString(record?.durationSeconds);
  const weight = asOptionalTrimmedString(record?.weight);
  const unit = record?.unit === "kg" ? "kg" : "lbs";

  if (!exerciseName) return null;
  if (!reps && !durationSeconds) return null;
  if (reps && durationSeconds) return null;
  if (reps && !/^\d+$/.test(reps)) return null;
  if (durationSeconds && !/^\d+$/.test(durationSeconds)) return null;
  if (weight && !/^\d+(\.\d+)?$/.test(weight)) return null;

  const corePrompt = durationSeconds
    ? `${durationSeconds} sec ${exerciseName}`
    : `${reps} ${exerciseName}`;

  return weight ? `${corePrompt} @ ${weight} ${unit}` : corePrompt;
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
  const [isSending, setIsSending] = useState(false);
  const sessionBootstrapRef = useRef<Promise<string | null> | null>(null);
  const sessionDateRef = useRef<string | null>(null);
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

  const isWorking =
    isSending || status === "streaming" || status === "submitted";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWorking]);

  async function sendPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || isWorking) return;

    setIsSending(true);
    setInput("");

    try {
      const ensuredSessionId = await ensureSessionId();
      trackEvent("Coach Message Sent", {
        messageLength: trimmed.length,
        turnIndex: messages.length,
      });

      await sendMessage(
        { text: trimmed },
        {
          body: {
            ...(ensuredSessionId ? { sessionId: ensuredSessionId } : {}),
            preferences: {
              unit,
              soundEnabled,
              timezoneOffsetMinutes: new Date().getTimezoneOffset(),
            },
          },
        }
      );
    } finally {
      setIsSending(false);
    }
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

  const jsonRenderHandlers: Record<string, JsonRenderActionHandler> = {
    submit_prompt: async (params) => {
      const prompt = asOptionalTrimmedString(asRecord(params)?.prompt);
      if (prompt) {
        await sendPrompt(prompt);
      }
    },
    prefill_prompt: (params) => {
      const prompt = asOptionalTrimmedString(asRecord(params)?.prompt);
      if (prompt) {
        setInput(prompt);
      }
    },
    undo_agent_action: async (params) => {
      const record = asRecord(params);
      const actionId = record?.actionId;
      const turnId = record?.turnId;
      if (typeof actionId === "string" && typeof turnId === "string") {
        await undoAction(actionId, turnId);
      }
    },
    set_preference: async (params) => {
      const record = asRecord(params);
      if (record?.key === "unit") {
        if (record.value === "lbs" || record.value === "kg") {
          setUnit(record.value);
        }
        return;
      }

      if (
        record?.key === "sound_enabled" &&
        typeof record.value === "boolean"
      ) {
        setSoundEnabled(record.value);
      }
    },
    quick_log_submit: async (params) => {
      const prompt = buildQuickLogPrompt(params);
      if (prompt) {
        await sendPrompt(prompt);
      }
    },
    send_prompt: async (params) => {
      const prompt = asOptionalTrimmedString(asRecord(params)?.prompt);
      if (prompt) {
        await sendPrompt(prompt);
      }
    },
    coach_send_prompt: async (params) => {
      const prompt = asOptionalTrimmedString(asRecord(params)?.prompt);
      if (prompt) {
        await sendPrompt(prompt);
      }
    },
    undo_action: async (params) => {
      const record = asRecord(params);
      const actionId = record?.actionId;
      const turnId = record?.turnId;
      if (typeof actionId === "string" && typeof turnId === "string") {
        await undoAction(actionId, turnId);
      }
    },
    coach_undo_action: async (params) => {
      const record = asRecord(params);
      const actionId = record?.actionId;
      const turnId = record?.turnId;
      if (typeof actionId === "string" && typeof turnId === "string") {
        await undoAction(actionId, turnId);
      }
    },
    set_weight_unit: async (params) => {
      const record = asRecord(params);
      if (record?.unit === "lbs" || record?.unit === "kg") {
        setUnit(record.unit);
      }
    },
    set_sound: async (params) => {
      const record = asRecord(params);
      if (typeof record?.enabled === "boolean") {
        setSoundEnabled(record.enabled);
      }
    },
    open_checkout: async () => {
      await runClientAction("open_checkout");
    },
    open_billing_portal: async () => {
      await runClientAction("open_billing_portal");
    },
    run_client_action: async (params) => {
      const record = asRecord(params);
      const action = record?.action;
      if (action === "open_checkout" || action === "open_billing_portal") {
        await runClientAction(action);
      }
    },
  };

  return {
    input,
    setInput,
    isWorking,
    messages,
    unit,
    soundEnabled,
    endRef,
    sendPrompt,
    undoAction,
    runClientAction,
    jsonRenderHandlers,
  };
}

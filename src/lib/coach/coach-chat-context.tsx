"use client";

import { createContext, useContext } from "react";

/**
 * Callbacks for interactive coach blocks (suggestions, undo, billing, etc.).
 *
 * Registry components consume this via useContext instead of relying on
 * json-render's emit() — which has no consumer in the Renderer tree.
 */
export interface CoachChatCallbacks {
  sendPrompt: (prompt: string) => void;
  undoAction: (actionId: string, turnId: string) => void;
  runClientAction: (action: "open_checkout" | "open_billing_portal") => void;
}

const noop = () => {};

export const CoachChatContext = createContext<CoachChatCallbacks>({
  sendPrompt: noop,
  undoAction: noop,
  runClientAction: noop,
});

export function useCoachChatCallbacks(): CoachChatCallbacks {
  return useContext(CoachChatContext);
}

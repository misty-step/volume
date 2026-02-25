"use client";

import { type FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CoachBlockRenderer } from "@/components/coach/CoachBlockRenderer";
import { useCoachChat } from "@/components/coach/useCoachChat";

export function CoachPrototype() {
  const {
    input,
    setInput,
    isWorking,
    lastTrace,
    timeline,
    unit,
    soundEnabled,
    endRef,
    sendPrompt,
    undoAction,
  } = useCoachChat();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(input);
  }

  // 5.5rem = mobile BottomNav height (h-16) + breathing room. Safe-area keeps
  // the composer clear of iOS home indicator.
  return (
    <main className="mx-auto w-full max-w-4xl flex flex-1 min-h-0 flex-col px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6">
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

      {/* Scrollable timeline: keeps newest messages reachable above fixed mobile UI. */}
      <div
        data-testid="coach-timeline"
        className="flex-1 min-h-0 overflow-y-auto mt-4 space-y-4 pb-6 md:pb-4"
      >
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
                  {message.blocks.map((entry) => (
                    <CoachBlockRenderer
                      key={entry.id}
                      block={entry.block}
                      onPrompt={(prompt) => {
                        void sendPrompt(prompt);
                      }}
                      onUndo={(actionId, turnId) => {
                        void undoAction(actionId, turnId);
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

      <form
        onSubmit={handleSubmit}
        data-testid="coach-composer"
        className="flex items-center gap-2 mt-4 pt-2"
      >
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

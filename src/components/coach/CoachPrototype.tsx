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
  } = useCoachChat();

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
                  {message.blocks.map((entry) => (
                    <CoachBlockRenderer
                      key={entry.id}
                      block={entry.block}
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

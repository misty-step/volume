"use client";

import { type FormEvent, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";
import { CoachBlockRenderer } from "@/components/coach/CoachBlockRenderer";
import { useCoachChat } from "@/components/coach/useCoachChat";
import { cn } from "@/lib/utils";

export function CoachPrototype() {
  const searchParams = useSearchParams();
  const promptedRef = useRef<string | null>(null);
  const {
    input,
    setInput,
    isWorking,
    timeline,
    endRef,
    sendPrompt,
    undoAction,
    runClientAction,
  } = useCoachChat();

  const promptFromQuery = searchParams.get("prompt");

  useEffect(() => {
    if (!promptFromQuery) return;
    if (promptedRef.current === promptFromQuery) return;
    promptedRef.current = promptFromQuery;
    void sendPrompt(promptFromQuery);
  }, [promptFromQuery, sendPrompt]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(input);
  }

  return (
    <main className="relative mx-auto flex w-full max-w-4xl flex-1 min-h-0 flex-col px-3 pt-3 pb-[calc(8.25rem+env(safe-area-inset-bottom))] md:px-4 md:pb-6">
      <p className="mb-2 px-1 text-xs text-muted-foreground">
        Try &quot;12 pushups&quot;, &quot;show today&apos;s summary&quot;, or
        ask for insights.
      </p>

      <section
        data-testid="coach-timeline"
        className="flex-1 min-h-0 space-y-2 overflow-y-auto pb-4 pr-1"
      >
        {timeline.map((message) => (
          <article
            key={message.id}
            className={
              message.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            <div
              className={cn(
                "max-w-[92%] rounded-xl px-3 py-3",
                "rounded-[--radius] border border-border-subtle bg-card",
                message.role === "user"
                  ? "ml-10 border-accent/42 bg-accent/14"
                  : "mr-10"
              )}
            >
              <p className="text-sm whitespace-pre-wrap text-foreground">
                {message.text}
              </p>
              {message.blocks && message.blocks.length > 0 ? (
                <div className="mt-3 space-y-3">
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
                      onClientAction={(action) => {
                        void runClientAction(action);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}

        {isWorking ? (
          <div
            className={cn(
              "mr-10 flex max-w-[92%] items-center gap-2 rounded-xl px-3 py-2",
              "rounded-[--radius] border border-border-subtle bg-card"
            )}
          >
            <ReloadIcon className="h-4 w-4 animate-spin text-accent" />
            <p className="text-xs text-muted-foreground">Planning...</p>
          </div>
        ) : null}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={handleSubmit}
        data-testid="coach-composer"
        className="border-t border-border-subtle bg-card p-[8px] pb-[calc(8px+env(safe-area-inset-bottom,0px))] sticky bottom-0"
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='Log fast: "12 pushups @ 25 lbs"'
            disabled={isWorking}
            className="h-11 w-full flex-1 rounded-[--radius] border border-input bg-background/76 px-3 text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
          />
          <button
            type="submit"
            disabled={isWorking || input.trim().length === 0}
            className="inline-flex min-h-[44px] min-w-[5rem] items-center justify-center gap-2 rounded-[--radius] bg-accent px-4 text-sm font-medium text-accent-foreground transition-all duration-150 hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PaperPlaneIcon className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    </main>
  );
}

"use client";

import { type FormEvent, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";
import { CoachBlockRenderer } from "@/components/coach/CoachBlockRenderer";
import { LogConfirmationBlock } from "@/components/ui/coach-block";
import { useCoachChat } from "@/components/coach/useCoachChat";
import type { CoachBlock } from "@/lib/coach/schema";
import { cn } from "@/lib/utils";

type TimelineBlock = { id: string; block: CoachBlock };
type MergedEntry =
  | { kind: "block"; entry: TimelineBlock }
  | { kind: "log_confirmation"; status: TimelineBlock; undo: TimelineBlock };

function mergeBlocks(blocks: TimelineBlock[]): MergedEntry[] {
  const merged: MergedEntry[] = [];
  let i = 0;
  while (i < blocks.length) {
    const current = blocks[i];
    const next = blocks[i + 1];
    if (
      current &&
      next &&
      current.block.type === "status" &&
      current.block.tone === "success" &&
      next.block.type === "undo"
    ) {
      merged.push({ kind: "log_confirmation", status: current, undo: next });
      i += 2;
    } else if (current) {
      merged.push({ kind: "block", entry: current });
      i += 1;
    } else {
      i += 1;
    }
  }
  return merged;
}

export function CoachPrototype() {
  const searchParams = useSearchParams();
  const promptedRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Refocus input whenever the agent finishes working.
  const prevWorking = useRef(isWorking);
  useEffect(() => {
    if (prevWorking.current && !isWorking) {
      inputRef.current?.focus();
    }
    prevWorking.current = isWorking;
  }, [isWorking]);

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
    <main className="relative mx-auto flex w-full max-w-4xl flex-1 min-h-0 flex-col px-3 pt-3 pb-2 md:px-4 md:pb-6">
      <p className="mb-2 px-1 text-xs text-muted-foreground">
        Try &quot;12 pushups&quot;, &quot;show today&apos;s summary&quot;, or
        ask for insights.
      </p>

      <section
        data-testid="coach-timeline"
        className="flex-1 min-h-0 space-y-2 overflow-y-auto pb-4 pr-1"
      >
        {timeline.map((message) => {
          const hasText = message.text.trim().length > 0;
          const hasBlocks = (message.blocks?.length ?? 0) > 0;
          const merged = message.blocks ? mergeBlocks(message.blocks) : [];

          return (
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
                {message.isStreaming && !hasText && !hasBlocks ? (
                  <div className="flex items-center gap-2">
                    <ReloadIcon className="h-4 w-4 animate-spin text-accent" />
                    <p className="text-xs text-muted-foreground">Planning...</p>
                  </div>
                ) : null}
                {hasBlocks ? (
                  <div className="space-y-3">
                    {merged.map((entry) => {
                      if (entry.kind === "log_confirmation") {
                        const statusBlock = entry.status.block;
                        const undoBlock = entry.undo.block;
                        if (
                          statusBlock.type !== "status" ||
                          undoBlock.type !== "undo"
                        )
                          return null;
                        return (
                          <LogConfirmationBlock
                            key={entry.status.id}
                            title={statusBlock.title}
                            actionId={undoBlock.actionId}
                            turnId={undoBlock.turnId}
                            onUndo={(actionId, turnId) => {
                              void undoAction(actionId, turnId);
                            }}
                          />
                        );
                      }
                      return (
                        <CoachBlockRenderer
                          key={entry.entry.id}
                          block={entry.entry.block}
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
                      );
                    })}
                  </div>
                ) : null}
                {hasText && message.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap text-foreground">
                    {message.text}
                  </p>
                ) : hasText ? (
                  <div className={cn(hasBlocks && "mt-3")}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="text-sm leading-relaxed text-foreground [&:not(:last-child)]:mb-2">
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-outside pl-4 space-y-1 mb-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-outside pl-4 space-y-1 mb-2">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-sm leading-relaxed">
                            {children}
                          </li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-muted-foreground">
                            {children}
                          </em>
                        ),
                        code: ({ children }) => (
                          <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={handleSubmit}
        data-testid="coach-composer"
        className="border-t border-border-subtle bg-card p-[8px] pb-[calc(8px+env(safe-area-inset-bottom,0px))] sticky bottom-0"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            autoFocus
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

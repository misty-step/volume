"use client";

import {
  Component,
  type FormEvent,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useJsonRenderMessage } from "@json-render/react";
import { PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";
import { CoachSpecRenderer } from "@/components/coach/CoachBlockRenderer";
import { ExerciseTicker } from "@/components/coach/ExerciseTicker";
import { useCoachChat } from "@/components/coach/useCoachChat";
import { reportError } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

function getUserMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}

const markdownComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="text-sm leading-relaxed text-foreground [&:not(:last-child)]:mb-2">
      {children}
    </p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="list-disc list-outside pl-4 space-y-1 mb-2">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="list-decimal list-outside pl-4 space-y-1 mb-2">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="text-sm leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),
};

class CoachTickerBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError(error, {
      component: "CoachTickerBoundary",
      componentStack: errorInfo.componentStack,
      operation: "render",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="coach-ticker-fallback"
          className="w-full border-b border-border-subtle bg-card/60 px-4 py-2.5 backdrop-blur-sm"
        >
          <p className="text-center text-xs text-muted-foreground">
            Today&apos;s exercise summary is temporarily unavailable.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

function AssistantMessageBody({
  message,
  loading,
  handlers,
}: {
  message: UIMessage;
  loading: boolean;
  handlers: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
}) {
  const { spec, text, hasSpec } = useJsonRenderMessage(message.parts);
  const trimmedText = text.trim();

  return (
    <>
      {hasSpec && spec ? (
        <div className="space-y-3">
          <CoachSpecRenderer
            spec={spec}
            loading={loading}
            handlers={handlers}
          />
        </div>
      ) : null}

      {trimmedText ? (
        <div className={cn(hasSpec && "mt-3")}>
          <ReactMarkdown components={markdownComponents}>
            {trimmedText}
          </ReactMarkdown>
        </div>
      ) : null}

      {loading && !trimmedText && !hasSpec ? (
        <div className="flex items-center gap-2">
          <ReloadIcon className="h-4 w-4 animate-spin text-accent" />
          <p className="text-xs text-muted-foreground">Planning...</p>
        </div>
      ) : null}
    </>
  );
}

export function CoachPrototype() {
  const searchParams = useSearchParams();
  const promptedRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const promptFromQuery = searchParams.get("prompt");
  const kickoffSource = promptFromQuery ? "deeplink" : "page_load";
  const {
    input,
    setInput,
    isWorking,
    messages,
    error,
    endRef,
    sendPrompt,
    jsonRenderHandlers,
  } = useCoachChat({ kickoffSource });

  // Refocus input whenever the agent finishes working.
  const prevWorking = useRef(isWorking);
  useEffect(() => {
    if (prevWorking.current && !isWorking) {
      inputRef.current?.focus();
    }
    prevWorking.current = isWorking;
  }, [isWorking]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardOffset = () => {
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop
      );
      setKeyboardOffset(keyboardHeight);
    };

    updateKeyboardOffset();
    viewport.addEventListener("resize", updateKeyboardOffset);
    viewport.addEventListener("scroll", updateKeyboardOffset);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardOffset);
      viewport.removeEventListener("scroll", updateKeyboardOffset);
    };
  }, []);

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

  function handleInputFocus() {
    requestAnimationFrame(() => {
      inputRef.current?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    });
  }

  // The latest assistant message gets streaming indicator support.
  const lastAssistantIdx =
    messages.length > 0
      ? messages.reduce((acc, m, i) => (m.role === "assistant" ? i : acc), -1)
      : -1;

  return (
    <main className="relative mx-auto flex w-full max-w-4xl h-[calc(100dvh-52px)] flex-col pb-2 md:pb-6">
      <section
        data-testid="coach-timeline"
        className="flex-1 min-h-0 space-y-2 overflow-y-auto px-3 pb-4 pr-1 md:px-4"
      >
        <div className="sticky top-0 z-30 -mx-3 md:-mx-4">
          <CoachTickerBoundary>
            <ExerciseTicker />
          </CoachTickerBoundary>
        </div>
        <p className="px-1 text-xs text-muted-foreground md:px-1">
          Try &quot;12 pushups&quot;, &quot;show today&apos;s summary&quot;, or
          ask for insights.
        </p>
        {messages.length === 0 && !isWorking && (
          <article className="flex justify-start">
            <div className="max-w-[92%] rounded-xl px-3 py-3 rounded-[--radius] border border-border-subtle bg-card mr-10">
              <p className="text-sm leading-relaxed text-foreground">
                Agent ready. Ask to log a set, review progress, or update
                settings.
              </p>
            </div>
          </article>
        )}

        {messages.map((message, idx) => {
          const isLatestAssistant = idx === lastAssistantIdx;

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
                {message.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap text-foreground">
                    {getUserMessageText(message)}
                  </p>
                ) : null}
                {message.role === "assistant" ? (
                  <AssistantMessageBody
                    message={message}
                    loading={isLatestAssistant && isWorking}
                    handlers={jsonRenderHandlers}
                  />
                ) : null}
              </div>
            </article>
          );
        })}
        {isWorking &&
        (messages.length === 0 || lastAssistantIdx < messages.length - 1) ? (
          <article className="flex justify-start">
            <div className="max-w-[92%] rounded-xl px-3 py-3 rounded-[--radius] border border-border-subtle bg-card mr-10">
              <div className="flex items-center gap-2">
                <ReloadIcon className="h-4 w-4 animate-spin text-accent" />
                <p className="text-xs text-muted-foreground">Planning...</p>
              </div>
            </div>
          </article>
        ) : null}
        {error && !isWorking ? (
          <article className="flex justify-start">
            <div className="max-w-[92%] rounded-xl px-3 py-3 rounded-[--radius] border border-destructive/50 bg-destructive/10 mr-10">
              <p className="text-sm text-destructive">
                Something went wrong. Please try again.
              </p>
            </div>
          </article>
        ) : null}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={handleSubmit}
        data-testid="coach-composer"
        className="mx-3 border-t border-border-subtle bg-card p-[8px] pb-[calc(8px+env(safe-area-inset-bottom,0px))] sticky bottom-0 md:mx-4"
        style={{ bottom: `${keyboardOffset}px` }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={handleInputFocus}
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

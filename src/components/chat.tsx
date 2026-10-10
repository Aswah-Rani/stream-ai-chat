"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

const SUGGESTED_PROMPTS = [
  "Explain streaming chat in plain language.",
  "Give me three ideas for a weekend project.",
  "Summarize how conversation history helps an LLM.",
];

const NEAR_BOTTOM_PX = 96;

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<UIMessage["parts"][number], { type: "text" }> => {
      return part.type === "text";
    })
    .map((part) => part.text)
    .join("");
}

export function Chat() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const [stoppedMessageId, setStoppedMessageId] = useState<string | null>(null);

  const { messages, sendMessage, status, stop, error, clearError, regenerate } =
    useChat({
      transport,
      onFinish: ({ message, isAbort }) => {
        setStoppedMessageId(isAbort ? message.id : null);
      },
    });

  const [input, setInput] = useState("");
  const [followBottom, setFollowBottom] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isGenerating = status === "submitted" || status === "streaming";
  const canSubmit = !isGenerating && input.trim().length > 0;

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_PX;
    setFollowBottom(nearBottom);
    setShowJumpToLatest(!nearBottom);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    setFollowBottom(true);
    setShowJumpToLatest(false);
  }, []);

  useEffect(() => {
    if (!followBottom) {
      return;
    }

    bottomRef.current?.scrollIntoView({
      behavior: status === "streaming" ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, status, followBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const submitText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isGenerating) {
        return;
      }

      clearError();
      setStoppedMessageId(null);
      setFollowBottom(true);
      setShowJumpToLatest(false);
      void sendMessage({ text: trimmed });
      setInput("");
    },
    [clearError, isGenerating, sendMessage],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitText(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitText(input);
    }
  }

  function handleStop() {
    stop();
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  const lastMessage = messages[messages.length - 1];
  const lastAssistantText =
    lastMessage?.role === "assistant" ? getMessageText(lastMessage) : "";
  const showThinking =
    status === "submitted" || (status === "streaming" && lastAssistantText.length === 0);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,_#eef2ff_0%,_transparent_42%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18)_0%,_transparent_40%),linear-gradient(to_bottom,_#020617,_#0f172a)] dark:text-slate-100">
      <header className="border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
              Streaming AI Chat
            </p>
            <h1 className="text-lg font-semibold sm:text-xl">Claude assistant</h1>
          </div>
          <p className="hidden text-right text-xs text-slate-500 sm:block dark:text-slate-400">
            History is kept for this session.
            <br />
            Stop anytime without losing the thread.
          </p>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
          onScroll={updateScrollState}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Chat messages"
        >
          {messages.length === 0 ? (
            <WelcomeScreen onSelectPrompt={submitText} disabled={isGenerating} />
          ) : (
            <ol className="flex flex-col gap-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  stopped={message.id === stoppedMessageId}
                />
              ))}
            </ol>
          )}

          {showThinking ? <ThinkingIndicator /> : null}

          {error ? (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-100"
            >
              <p className="font-medium">Something went wrong.</p>
              <p className="mt-1 break-words font-mono text-xs">{error.message}</p>
              <p className="mt-1 text-red-700 dark:text-red-200">
                The previous messages are still here. Check your API key, then retry or send a new
                message.
              </p>
              <button
                type="button"
                className="mt-3 rounded-full bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                onClick={() => {
                  clearError();
                  void regenerate();
                }}
              >
                Retry last response
              </button>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        {showJumpToLatest ? (
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-lg hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Jump to latest
          </button>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200/80 bg-white/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-indigo-400 dark:border-slate-700 dark:bg-slate-900">
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              placeholder={isGenerating ? "Waiting for the assistant..." : "Ask anything..."}
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-base leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
            {isGenerating ? (
              <button
                type="button"
                onClick={handleStop}
                className="min-h-11 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSubmit}
                className="min-h-11 shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              >
                Send
              </button>
            )}
          </div>
          <p className="mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">
            Enter to send, Shift+Enter for a new line. Empty messages are ignored.
          </p>
        </form>
      </div>
    </div>
  );
}

function WelcomeScreen({
  onSelectPrompt,
  disabled,
}: {
  onSelectPrompt: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="max-w-lg">
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Welcome</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">What would you like to explore?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Ask a question or start with a suggestion. Replies stream in as they are generated, and
          you can stop a response without losing the conversation.
        </p>
      </div>
      <ul className="mt-8 grid w-full gap-3 sm:grid-cols-3">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectPrompt(prompt)}
              className="h-full w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-slate-800"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MessageBubble({
  message,
  stopped = false,
}: {
  message: UIMessage;
  stopped?: boolean;
}) {
  const isUser = message.role === "user";
  const text = getMessageText(message);

  return (
    <li className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-[min(100%,36rem)] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "bg-indigo-600 text-white"
            : "border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        }`}
        aria-label={isUser ? "Your message" : "Assistant message"}
      >
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
          {isUser ? "You" : "Assistant"}
        </p>
        <p className="whitespace-pre-wrap break-words">{text || (isUser ? "" : "…")}</p>
        {stopped ? (
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide opacity-70">
            Generation stopped
          </p>
        ) : null}
      </article>
    </li>
  );
}

function ThinkingIndicator() {
  return (
    <div
      className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      aria-live="polite"
    >
      <span className="flex gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" />
      </span>
      Thinking…
    </div>
  );
}
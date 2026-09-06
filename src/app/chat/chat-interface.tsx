"use client";

import { useRef, useState, useTransition } from "react";
import {
  sendMessage,
  confirmPlan,
  cancelPlan,
  type ChatState,
  type MessageRow,
} from "./actions";
import type { AgentPlan } from "@/lib/agent";

// ─── Message rendering ────────────────────────────────────────────────────────

function PlanBlock({
  plan,
  messageId,
  conversationId,
  onAction,
}: {
  plan: AgentPlan;
  messageId: string;
  conversationId: string;
  onAction: (state: ChatState) => void;
}) {
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const next = await confirmPlan(conversationId, messageId);
      onAction(next);
    });
  }

  function cancel() {
    startTransition(async () => {
      const next = await cancelPlan(conversationId, messageId);
      onAction(next);
    });
  }

  if (plan.status !== "pending") {
    const label =
      plan.status === "cancelled"
        ? "Cancelled"
        : plan.status === "done"
          ? "Executed"
          : plan.status === "error"
            ? "Failed"
            : "Confirmed";
    return (
      <span className="text-xs text-zinc-400 italic">[{label}]</span>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={confirm}
        disabled={pending}
        className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background disabled:opacity-50"
      >
        {pending ? "Running…" : "Confirm"}
      </button>
      <button
        onClick={cancel}
        disabled={pending}
        className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-medium disabled:opacity-50 dark:border-zinc-700"
      >
        Cancel
      </button>
    </div>
  );
}

function MessageBubble({
  msg,
  conversationId,
  onAction,
}: {
  msg: MessageRow;
  conversationId: string;
  onAction: (state: ChatState) => void;
}) {
  const isUser = msg.role === "user";
  const plan = msg.metadata?.plan;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-foreground text-background"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }`}
      >
        <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
        {plan && (
          <PlanBlock
            plan={plan}
            messageId={msg.id}
            conversationId={conversationId}
            onAction={onAction}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatInterface({
  initialState,
}: {
  initialState: ChatState;
}) {
  const [state, setState] = useState(initialState);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  function handleAction(next: ChatState) {
    setState(next);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || pending) return;
    const command = input;
    setInput("");
    startTransition(async () => {
      const next = await sendMessage(state.conversationId || null, command);
      handleAction(next);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Messages */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        {state.messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-zinc-400">
            <p className="text-sm">
              Describe what you want to do with your inbox.
            </p>
            <div className="flex flex-col gap-1 text-xs">
              <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                "Summarize unread emails from this week"
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                "Archive all promotional emails"
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                "Star emails from my team"
              </span>
            </div>
          </div>
        )}
        {state.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            conversationId={state.conversationId}
            onAction={handleAction}
          />
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-800">
              Thinking…
            </div>
          </div>
        )}
        {state.error && (
          <p className="text-center text-xs text-red-500">{state.error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what to do with your inbox…"
            disabled={pending}
            className="flex-1 rounded-full border border-zinc-200 bg-transparent px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50 dark:border-zinc-700"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

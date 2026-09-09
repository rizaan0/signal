"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendMessage,
  confirmPlan,
  cancelPlan,
  type ChatState,
  type MessageRow,
} from "./actions";
import type { AgentRun } from "@/lib/agent";
import type { ThinkingLevel } from "@/lib/app-data";
import { ChatComposer } from "@/components/chat-composer";
import { usePreferences } from "@/components/preferences-provider";

// ─── Message rendering ────────────────────────────────────────────────────────

function PlanBlock({
  run,
  messageId,
  conversationId,
  onAction,
}: {
  run: AgentRun;
  messageId: string;
  conversationId: string;
  onAction: (state: ChatState) => void;
}) {
  const [pending, startTransition] = useTransition();
  const args =
    run.pendingToolCall?.args &&
    typeof run.pendingToolCall.args === "object" &&
    !Array.isArray(run.pendingToolCall.args)
      ? (run.pendingToolCall.args as Record<string, unknown>)
      : {};
  const action = run.pendingToolCall?.name ?? "";
  const actionLabel: Record<string, string> = {
    archive_messages: "Archive selected messages",
    trash_messages: "Move selected messages to trash",
    star_messages: "Star selected messages",
    send_email: "Send this email",
    reply_to_message: "Send this reply",
  };
  const messageCount = Array.isArray(args.messageIds) ? args.messageIds.length : 0;

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

  if (run.status !== "pending_approval") {
    if (run.status === "done") return null;
    const label = run.status === "cancelled" ? "Action cancelled" : "Action failed";
    return <span className="mt-2 block text-xs text-tertiary">{label}</span>;
  }

  return (
    <div className="mt-4 border-t border-border-subtle pt-4">
      <strong className="block text-sm">{actionLabel[action] ?? "Approve this Gmail action"}</strong>
      <dl className="mt-3 space-y-2 text-xs">
        {messageCount ? (
          <div className="flex gap-2">
            <dt className="text-tertiary">Messages</dt>
            <dd>{messageCount} selected</dd>
          </div>
        ) : null}
        {typeof args.to === "string" ? (
          <div className="flex gap-2">
            <dt className="text-tertiary">To</dt>
            <dd className="break-all">{args.to}</dd>
          </div>
        ) : null}
        {typeof args.subject === "string" ? (
          <div className="flex gap-2">
            <dt className="text-tertiary">Subject</dt>
            <dd className="break-words">{args.subject}</dd>
          </div>
        ) : null}
        {typeof args.body === "string" ? (
          <div>
            <dt className="text-tertiary">Message</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-surface p-3">{args.body}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="button-primary"
        >
          {pending ? "Running action…" : actionLabel[action] ?? "Approve action"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="button-secondary"
        >
          Cancel
        </button>
      </div>
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
  const run = msg.metadata?.run;

  return (
    <article
      aria-label={isUser ? "You" : "Signal"}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[min(42rem,88%)] rounded-[1.25rem] px-4 py-3 text-sm leading-6 ${
          isUser
            ? "bg-user-message text-primary"
            : "border border-ui bg-elevated text-primary"
        }`}
      >
        <pre className="whitespace-pre-wrap break-words font-sans [overflow-wrap:anywhere]">{msg.content}</pre>
        {run && (
          <PlanBlock
            run={run}
            messageId={msg.id}
            conversationId={conversationId}
            onAction={onAction}
          />
        )}
      </div>
    </article>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatInterface({
  initialState,
  firstName = "there",
  model = "Gemini",
  greeting = "Hello",
}: {
  initialState: ChatState;
  firstName?: string;
  model?: string;
  greeting?: string;
}) {
  const [state, setState] = useState(initialState);
  const [input, setInput] = useState("");
  const { preferences } = usePreferences();
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(
    preferences.defaultThinkingLevel,
  );
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  function notifyFor(next: ChatState) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const latest = [...next.messages].reverse().find((message) => message.role === "assistant");
    const approvalNeeded = latest?.metadata?.run?.status === "pending_approval";
    if (approvalNeeded && preferences.notifyApprovalNeeded) {
      new Notification("Signal needs your approval", {
        body: "Review the proposed Gmail action before it runs.",
      });
    } else if (!approvalNeeded && preferences.notifyAgentCompletion) {
      new Notification("Signal finished", {
        body: "Your inbox request is ready to review.",
      });
    }
  }

  function handleAction(next: ChatState, showNotification = true) {
    setState(next);
    if (showNotification) notifyFor(next);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function sendCommand(command: string) {
    const trimmed = command.trim();
    if (!trimmed || pending) return;
    setInput("");
    startTransition(async () => {
      const wasNew = !state.conversationId;
      const next = await sendMessage(
        state.conversationId || null,
        trimmed,
        thinkingLevel,
      );
      handleAction(next);
      if (wasNew && next.conversationId) {
        window.dispatchEvent(new Event("signal:conversations-changed"));
        router.replace(`/chat/${next.conversationId}`);
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="sr-only" aria-live="polite">
        {pending
          ? "Signal is thinking."
          : [...state.messages].reverse().find((message) => message.metadata?.run)?.metadata?.run
                ?.status === "pending_approval"
            ? "Signal needs your approval."
            : ""}
      </p>
      {state.messages.length === 0 ? (
        <div className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-2xl">
            <div className="mb-8 text-center">
              <p className="eyebrow">Signal agent</p>
              <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                {greeting}, {firstName}.
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-secondary">
                What would you like to accomplish in your inbox?
              </p>
            </div>
            <ChatComposer
              value={input}
              onChange={setInput}
              onSend={() => sendCommand(input)}
              pending={pending}
              model={model}
              thinkingLevel={thinkingLevel}
              onThinkingLevelChange={setThinkingLevel}
            />
            <p role="alert" className="mt-3 min-h-5 text-center text-sm text-danger">{state.error}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 px-4 py-8">
            <div
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              className="mx-auto flex max-w-3xl flex-col gap-5"
            >
              {state.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  conversationId={state.conversationId}
                  onAction={handleAction}
                />
              ))}
              {pending ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-ui bg-elevated px-4 py-3 text-sm text-secondary">
                    Signal is thinking…
                  </div>
                </div>
              ) : null}
              {state.error ? (
                <p role="alert" className="text-center text-sm text-danger">{state.error}</p>
              ) : null}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="sticky bottom-0 bg-composer-fade px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8">
            <div className="mx-auto max-w-3xl">
              <ChatComposer
                value={input}
                onChange={setInput}
                onSend={() => sendCommand(input)}
                pending={pending}
                model={model}
                thinkingLevel={thinkingLevel}
                onThinkingLevelChange={setThinkingLevel}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

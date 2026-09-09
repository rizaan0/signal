"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import {
  cancelRun,
  displayRunText,
  resumeAgent,
  runAgent,
  type AgentRun,
} from "@/lib/agent";
import { LlmNotConfiguredError, type AgentMessage } from "@/lib/llm";
import { GmailError } from "@/lib/gmail";

export type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata: { run?: AgentRun } | null;
  created_at: string;
};

export type ChatState = {
  conversationId: string;
  messages: MessageRow[];
  error?: string;
};

const thinkingLevelSchema = z.enum(["low", "medium", "high"]);

async function loadMessages(conversationId: string): Promise<MessageRow[]> {
  const { data } = await getSupabase()
    .from("conversation_messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []) as MessageRow[];
}

async function ensureConversation(
  userId: string,
  conversationId: string | null,
  title: string,
): Promise<string> {
  const db = getSupabase();
  if (conversationId) {
    const { data } = await db
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return conversationId;
  }
  const { data } = await db
    .from("conversations")
    .insert({ user_id: userId, title })
    .select("id")
    .single();
  return data!.id;
}

async function ownedConversation(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { data } = await getSupabase()
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

function historyFromMessages(messages: MessageRow[]): AgentMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }));
}

function errorText(e: unknown): string {
  if (e instanceof LlmNotConfiguredError) return e.message;
  if (e instanceof GmailError) return `Error: ${e.message}`;
  if (e instanceof Error) return `Error: ${e.message}`;
  return "An unexpected error occurred.";
}

async function touchConversation(conversationId: string): Promise<void> {
  await getSupabase()
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function sendMessage(
  conversationId: string | null,
  command: string,
  thinkingLevel: string,
): Promise<ChatState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const trimmed = command.trim();
  const parsedThinkingLevel = thinkingLevelSchema.safeParse(thinkingLevel);
  if (!trimmed) {
    return {
      conversationId: conversationId ?? "",
      messages: [],
      error: "Message cannot be empty.",
    };
  }
  if (!parsedThinkingLevel.success) {
    return {
      conversationId: conversationId ?? "",
      messages: conversationId ? await loadMessages(conversationId) : [],
      error: "Invalid reasoning level.",
    };
  }

  const db = getSupabase();
  const userId = session.user.id;
  const convId = await ensureConversation(userId, conversationId, trimmed.slice(0, 50));

  await db.from("conversation_messages").insert({
    conversation_id: convId,
    role: "user",
    content: trimmed,
  });

  const prior = await loadMessages(convId);

  try {
    const run = await runAgent({
      userId,
      history: historyFromMessages(prior),
      thinkingLevel: parsedThinkingLevel.data,
    });
    await db.from("conversation_messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: displayRunText(run),
      metadata: { run },
    });
  } catch (e) {
    await db.from("conversation_messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: errorText(e),
    });
  }

  await touchConversation(convId);
  return { conversationId: convId, messages: await loadMessages(convId) };
}

export async function confirmPlan(
  conversationId: string,
  messageId: string,
): Promise<ChatState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const db = getSupabase();
  const userId = session.user.id;

  if (!(await ownedConversation(userId, conversationId))) {
    return {
      conversationId,
      messages: await loadMessages(conversationId),
      error: "Conversation not found.",
    };
  }

  const { data: msgData } = await db
    .from("conversation_messages")
    .select("metadata")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .maybeSingle();

  const run = (msgData?.metadata as { run?: AgentRun } | null)?.run;

  if (!run || run.status !== "pending_approval" || !run.pendingToolCall) {
    return {
      conversationId,
      messages: await loadMessages(conversationId),
      error: "Nothing pending approval.",
    };
  }

  try {
    const next = await resumeAgent({ userId, run });
    await db
      .from("conversation_messages")
      .update({
        metadata: {
          run: {
            ...run,
            status: "done",
            pendingToolCall: undefined,
          },
        },
      })
      .eq("id", messageId)
      .eq("conversation_id", conversationId);

    await db.from("conversation_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: displayRunText(next),
      metadata: { run: next },
    });
  } catch (e) {
    await db
      .from("conversation_messages")
      .update({
        metadata: { run: { ...run, status: "error", pendingToolCall: undefined } },
      })
      .eq("id", messageId)
      .eq("conversation_id", conversationId);

    await db.from("conversation_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: errorText(e),
    });
  }

  await touchConversation(conversationId);
  return { conversationId, messages: await loadMessages(conversationId) };
}

export async function cancelPlan(
  conversationId: string,
  messageId: string,
): Promise<ChatState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const db = getSupabase();
  const userId = session.user.id;

  if (!(await ownedConversation(userId, conversationId))) {
    return {
      conversationId,
      messages: await loadMessages(conversationId),
      error: "Conversation not found.",
    };
  }

  const { data: msgData } = await db
    .from("conversation_messages")
    .select("metadata")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .maybeSingle();

  const run = (msgData?.metadata as { run?: AgentRun } | null)?.run;

  if (!run || run.status !== "pending_approval") {
    return {
      conversationId,
      messages: await loadMessages(conversationId),
      error: "Nothing pending approval.",
    };
  }

  await db
    .from("conversation_messages")
    .update({ metadata: { run: cancelRun(run) } })
    .eq("id", messageId)
    .eq("conversation_id", conversationId);

  await db.from("conversation_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: "Action cancelled.",
  });

  return { conversationId, messages: await loadMessages(conversationId) };
}

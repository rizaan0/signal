"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import { buildPlan, executePlan, type AgentPlan } from "@/lib/agent";
import { GmailError } from "@/lib/gmail";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata: { plan?: AgentPlan } | null;
  created_at: string;
};

export type ChatState = {
  conversationId: string;
  messages: MessageRow[];
  error?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    // Verify ownership
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

// ─── Send message → plan ──────────────────────────────────────────────────────

export async function sendMessage(
  conversationId: string | null,
  command: string,
): Promise<ChatState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const trimmed = command.trim();
  if (!trimmed) {
    return {
      conversationId: conversationId ?? "",
      messages: [],
      error: "Message cannot be empty.",
    };
  }

  const db = getSupabase();
  const userId = session.user.id;

  // Title = first 50 chars of command
  const title = trimmed.slice(0, 50);
  const convId = await ensureConversation(userId, conversationId, title);

  // Save user message
  await db.from("conversation_messages").insert({
    conversation_id: convId,
    role: "user",
    content: trimmed,
  });

  // Build agent plan
  const plan = buildPlan(trimmed);

  // Save assistant message with plan in metadata
  await db.from("conversation_messages").insert({
    conversation_id: convId,
    role: "assistant",
    content: formatPlan(plan),
    metadata: { plan },
  });

  // Update conversation timestamp
  await db
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", convId);

  return { conversationId: convId, messages: await loadMessages(convId) };
}

// ─── Confirm plan execution ───────────────────────────────────────────────────

export async function confirmPlan(
  conversationId: string,
  messageId: string,
): Promise<ChatState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const db = getSupabase();
  const userId = session.user.id;

  // Load the plan message
  const { data: msgData } = await db
    .from("conversation_messages")
    .select("metadata")
    .eq("id", messageId)
    .maybeSingle();

  const plan = (msgData?.metadata as { plan?: AgentPlan } | null)?.plan;

  if (!plan) {
    return {
      conversationId,
      messages: await loadMessages(conversationId),
      error: "Plan not found.",
    };
  }

  // Mark plan as confirmed
  await db
    .from("conversation_messages")
    .update({ metadata: { plan: { ...plan, status: "confirmed" } } })
    .eq("id", messageId);

  let resultContent: string;
  let finalStatus: AgentPlan["status"] = "done";

  try {
    const result = await executePlan(plan, userId);
    resultContent = result.summary;
  } catch (e) {
    finalStatus = "error";
    if (e instanceof GmailError) {
      resultContent = `Error: ${e.message}`;
    } else if (e instanceof Error) {
      resultContent = `Error: ${e.message}`;
    } else {
      resultContent = "An unexpected error occurred.";
    }
  }

  // Update plan status in original message
  await db
    .from("conversation_messages")
    .update({ metadata: { plan: { ...plan, status: finalStatus } } })
    .eq("id", messageId);

  // Append result message
  await db.from("conversation_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: resultContent,
  });

  await db
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { conversationId, messages: await loadMessages(conversationId) };
}

// ─── Cancel plan ──────────────────────────────────────────────────────────────

export async function cancelPlan(
  conversationId: string,
  messageId: string,
): Promise<ChatState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const db = getSupabase();

  const { data: msgData } = await db
    .from("conversation_messages")
    .select("metadata")
    .eq("id", messageId)
    .maybeSingle();

  const plan = (msgData?.metadata as { plan?: AgentPlan } | null)?.plan;

  if (plan) {
    await db
      .from("conversation_messages")
      .update({ metadata: { plan: { ...plan, status: "cancelled" } } })
      .eq("id", messageId);
  }

  await db.from("conversation_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: "Action cancelled.",
  });

  return { conversationId, messages: await loadMessages(conversationId) };
}

// ─── Format plan for display ──────────────────────────────────────────────────

function formatPlan(plan: AgentPlan): string {
  const intentLabel: Record<AgentPlan["intent"], string> = {
    read: "Read emails",
    summarize: "Summarize emails",
    archive: "Archive emails",
    trash: "Trash emails",
    flag: "Star emails",
    reply: "Reply to emails",
  };
  const lines = [
    `**${intentLabel[plan.intent]}** matching: \`${plan.query}\``,
    "",
    "Steps:",
    ...plan.steps.map((s, i) => `${i + 1}. ${s.description}`),
  ];
  return lines.join("\n");
}

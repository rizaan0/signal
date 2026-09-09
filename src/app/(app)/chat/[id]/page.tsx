import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import { getAppUser, timeGreeting } from "@/lib/app-data";
import { ChatInterface } from "../chat-interface";
import type { ChatState, MessageRow } from "../actions";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const db = getSupabase();
  const { data: conversation } = await db
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!conversation) notFound();

  const { data: messages, error } = await db
    .from("conversation_messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const initialState: ChatState = {
    conversationId: id,
    messages: (messages ?? []) as MessageRow[],
  };

  const user = await getAppUser(session.user.id, session.user);
  return (
    <ChatInterface
      initialState={initialState}
      firstName={user.name.split(/\s+/)[0]}
      model={process.env.LLM_MODEL || "Gemini"}
      greeting={timeGreeting()}
    />
  );
}

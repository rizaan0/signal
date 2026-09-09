import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import { SignOutButton } from "@/app/sign-out-button";
import { ChatInterface } from "./chat-interface";
import type { ChatState, MessageRow } from "./actions";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const db = getSupabase();
  const userId = session.user.id;

  // Redirect to onboarding if no Gmail account connected
  const { data: gmailAccount } = await db
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!gmailAccount) {
    redirect("/onboarding");
  }

  // Load the most recent conversation, or start with empty state
  const { data: conv } = await db
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialState: ChatState = {
    conversationId: conv?.id ?? "",
    messages: [],
  };

  if (conv?.id) {
    const { data: msgs } = await db
      .from("conversation_messages")
      .select("id, role, content, metadata, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    initialState = {
      conversationId: conv.id,
      messages: (msgs ?? []) as MessageRow[],
    };
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <div>
          <span className="text-sm font-semibold">Signal</span>
          <span className="ml-2 text-xs text-zinc-500">{session.user.email}</span>
          <span className="ml-3 text-xs text-zinc-400">Inbox agent</span>
        </div>
        <SignOutButton />
      </header>

      <ChatInterface initialState={initialState} />
    </div>
  );
}

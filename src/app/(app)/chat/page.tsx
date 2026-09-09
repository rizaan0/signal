import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import { getAppUser, timeGreeting } from "@/lib/app-data";
import { ChatInterface } from "./chat-interface";
import type { ChatState } from "./actions";

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

  const user = await getAppUser(userId, session.user);
  const initialState: ChatState = { conversationId: "", messages: [] };
  return (
    <ChatInterface
      initialState={initialState}
      firstName={user.name.split(/\s+/)[0]}
      model={process.env.LLM_MODEL || "Gemini"}
      greeting={timeGreeting()}
    />
  );
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const db = getSupabase();
  const { data, error } = await db
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false })
    .limit(search ? 100 : 20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!search || !data?.length) {
    return NextResponse.json({ conversations: data ?? [] });
  }

  const ownedIds = data.map((conversation) => conversation.id);
  const escaped = search.replace(/[%_\\]/g, "\\$&");
  const { data: matchingMessages, error: messageError } = await db
    .from("conversation_messages")
    .select("conversation_id")
    .in("conversation_id", ownedIds)
    .ilike("content", `%${escaped}%`)
    .limit(100);

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  const matchingIds = new Set(
    (matchingMessages ?? []).map((message) => message.conversation_id),
  );
  const query = search.toLocaleLowerCase();
  const conversations = data.filter(
    (conversation) =>
      conversation.title?.toLocaleLowerCase().includes(query) ||
      matchingIds.has(conversation.id),
  );

  return NextResponse.json({ conversations });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await getSupabase()
    .from("conversations")
    .insert({ user_id: session.user.id, title: "New conversation" })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}

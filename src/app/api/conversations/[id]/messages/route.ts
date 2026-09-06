import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getSupabase();

  // Verify ownership
  const { data: conv } = await db
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await db
    .from("conversation_messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

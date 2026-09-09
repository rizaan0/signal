import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import { decryptToken } from "@/lib/token-crypto";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getSupabase();
  const { data: account, error: readError } = await db
    .from("gmail_accounts")
    .select("id, access_token, refresh_token, is_primary")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!account) {
    return NextResponse.json({ error: "Gmail account not found." }, { status: 404 });
  }

  let token: string | null = null;
  try {
    token =
      decryptToken(account.refresh_token) ?? decryptToken(account.access_token);
  } catch {
    // Token revocation is best-effort; the owned database row is still removed.
  }
  if (token) {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    ).catch(() => undefined);
  }

  const { error: deleteError } = await db
    .from("gmail_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { data: remaining } = await db
    .from("gmail_accounts")
    .select("id, is_primary")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: true });

  if (account.is_primary && remaining?.length && !remaining.some((item) => item.is_primary)) {
    await db
      .from("gmail_accounts")
      .update({ is_primary: true, updated_at: new Date().toISOString() })
      .eq("id", remaining[0].id)
      .eq("user_id", session.user.id);
  }

  return NextResponse.json({ disconnected: true, remaining: remaining?.length ?? 0 });
}

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import { gmailCallbackUrl } from "@/lib/gmail";
import { encryptToken } from "@/lib/token-crypto";

export const runtime = "nodejs";

function hmacSecret() {
  const s = process.env.GMAIL_OAUTH_HMAC_SECRET;
  if (!s) throw new Error("GMAIL_OAUTH_HMAC_SECRET is not set");
  return s;
}

function verifyState(state: string): boolean {
  const dot = state.lastIndexOf(".");
  if (dot === -1) return false;
  const nonce = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac("sha256", hmacSecret()).update(nonce).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL("/onboarding?error=access_denied", req.nextUrl.origin),
    );
  }

  if (!code || !state || !verifyState(state)) {
    return NextResponse.redirect(
      new URL("/onboarding?error=invalid_state", req.nextUrl.origin),
    );
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
    process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
    gmailCallbackUrl(),
  );

  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  // Get the connected email address
  const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
  const userInfo = await oauth2Api.userinfo.get();
  const email = userInfo.data.email;

  if (!email) {
    return NextResponse.redirect(
      new URL("/onboarding?error=no_email", req.nextUrl.origin),
    );
  }

  const db = getSupabase();
  const userId = session.user.id;

  // Check if this user already has a primary account
  const { data: primary } = await db
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  await db.from("gmail_accounts").upsert(
    {
      user_id: userId,
      email,
      access_token: encryptToken(tokens.access_token ?? null),
      refresh_token: encryptToken(tokens.refresh_token ?? null),
      expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      is_primary: !primary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,email" },
  );

  return NextResponse.redirect(
    new URL("/onboarding?connected=1", req.nextUrl.origin),
  );
}

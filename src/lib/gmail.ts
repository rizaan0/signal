import "server-only";
import { google } from "googleapis";
import { getSupabase } from "@/lib/supabase";
import { encryptToken, decryptToken } from "@/lib/token-crypto";

// ─── Error type ───────────────────────────────────────────────────────────────

export class GmailError extends Error {
  constructor(
    public code: "no_account" | "revoked" | "quota" | "api_error",
    message: string,
  ) {
    super(message);
    this.name = "GmailError";
  }
}

// ─── Internal types ───────────────────────────────────────────────────────────

export type GmailAccountRow = {
  id: string;
  user_id: string;
  email: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  is_primary: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clientId() {
  return process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
}
function clientSecret() {
  return process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
}
export function gmailCallbackUrl() {
  const base =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  return `${base}/api/gmail/callback`;
}

// ─── Gmail client factory ────────────────────────────────────────────────────

export async function getGmailClient(userId: string, accountEmail?: string) {
  const db = getSupabase();

  let q = db
    .from("gmail_accounts")
    .select("id, user_id, email, access_token, refresh_token, expires_at, is_primary")
    .eq("user_id", userId);

  if (accountEmail) q = q.eq("email", accountEmail);
  else q = q.eq("is_primary", true);

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data)
    throw new GmailError("no_account", "No Gmail account connected. Complete onboarding first.");

  const account = data as GmailAccountRow;
  const accessToken = decryptToken(account.access_token);
  const refreshToken = decryptToken(account.refresh_token);

  const oauth2 = new google.auth.OAuth2(
    clientId(),
    clientSecret(),
    gmailCallbackUrl(),
  );
  oauth2.setCredentials({
    access_token: accessToken ?? undefined,
    refresh_token: refreshToken ?? undefined,
  });

  // Refresh proactively if within 5 min of expiry
  if (account.expires_at) {
    const expiresAt = new Date(account.expires_at).getTime();
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      const { credentials } = await oauth2.refreshAccessToken();
      oauth2.setCredentials(credentials);
      await db
        .from("gmail_accounts")
        .update({
          access_token: encryptToken(credentials.access_token ?? null),
          expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);
    }
  }

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  return { client: gmail, account };
}

import { createHmac, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gmailCallbackUrl } from "@/lib/gmail";
import { google } from "googleapis";

export const runtime = "nodejs";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
];

function hmacSecret() {
  const s = process.env.GMAIL_OAUTH_HMAC_SECRET;
  if (!s) throw new Error("GMAIL_OAUTH_HMAC_SECRET is not set");
  return s;
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nonce = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", hmacSecret()).update(nonce).digest("hex");
  const state = `${nonce}.${sig}`;

  const oauth2 = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
    process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
    gmailCallbackUrl(),
  );

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });

  return NextResponse.json({ url });
}

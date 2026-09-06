import type { Account } from "next-auth";
import { getSupabase } from "@/lib/supabase";
import { encryptToken } from "@/lib/token-crypto";

export async function findUserByEmail(email: string) {
  const { data, error } = await getSupabase()
    .from("users")
    .select("id, name, email, image, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createPasswordUser(input: {
  name?: string;
  email: string;
  passwordHash: string;
}) {
  const { data, error } = await getSupabase()
    .from("users")
    .insert({
      name: input.name,
      email: input.email,
      password_hash: input.passwordHash,
    })
    .select("id, name, email")
    .single();

  if (error) {
    if (error.code === "23505") {
      return null;
    }
    throw error;
  }

  return data;
}

export async function persistGoogleUser(
  user: { email?: string | null; name?: string | null; image?: string | null },
  account: Account,
): Promise<string> {
  const email = user.email;
  if (!email) {
    throw new Error("Google account has no email");
  }

  const db = getSupabase();

  const { data: existing, error: existingError } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  let userId = existing?.id as string | undefined;

  if (!userId) {
    const { data: created, error: createError } = await db
      .from("users")
      .insert({
        email,
        name: user.name,
        image: user.image,
        emailVerified: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError || !created?.id) {
      throw createError ?? new Error("Failed to create user");
    }
    userId = created.id as string;
  }

  if (!userId) {
    throw new Error("Failed to resolve user");
  }

  const { error: accountError } = await db.from("accounts").upsert(
    {
      userId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      refresh_token: account.refresh_token,
      access_token: account.access_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
    },
    { onConflict: "provider,providerAccountId" },
  );

  if (accountError) {
    throw accountError;
  }

  const { data: existingGmail, error: gmailLookupError } = await db
    .from("gmail_accounts")
    .select("id, is_primary")
    .eq("user_id", userId)
    .eq("email", email)
    .maybeSingle();

  if (gmailLookupError) {
    throw gmailLookupError;
  }

  const { data: primary, error: primaryError } = await db
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  if (primaryError) {
    throw primaryError;
  }

  const { error: gmailError } = await db.from("gmail_accounts").upsert(
    {
      user_id: userId,
      email,
      access_token: encryptToken(account.access_token ?? null),
      refresh_token: encryptToken(account.refresh_token ?? null),
      expires_at: account.expires_at
        ? new Date(account.expires_at * 1000).toISOString()
        : null,
      is_primary: existingGmail?.is_primary ?? !primary,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,email" },
  );

  if (gmailError) {
    throw gmailError;
  }

  return userId;
}

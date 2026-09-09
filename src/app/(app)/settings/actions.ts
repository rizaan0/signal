"use server";

import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";

export type SettingsActionState = {
  error?: string;
  success?: string;
};

const nameSchema = z.string().trim().min(1, "Enter a display name.").max(80);

export async function saveDisplayName(
  _state: SettingsActionState | null,
  formData: FormData,
): Promise<SettingsActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Your session expired. Sign in again." };

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { error } = await getSupabase()
    .from("users")
    .update({ name: parsed.data })
    .eq("id", session.user.id);

  if (error) return { error: error.message };
  return { success: "Display name updated." };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Use at least 8 characters."),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ["newPassword"],
    message: "Choose a different password.",
  });

export async function changePassword(
  _state: SettingsActionState | null,
  formData: FormData,
): Promise<SettingsActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Your session expired. Sign in again." };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const db = getSupabase();
  const { data: user, error: readError } = await db
    .from("users")
    .select("password_hash")
    .eq("id", session.user.id)
    .maybeSingle();

  if (readError) return { error: readError.message };
  if (!user?.password_hash) {
    return { error: "Password changes are unavailable for Google-only accounts." };
  }
  if (!(await compare(parsed.data.currentPassword, user.password_hash))) {
    return { error: "Current password is incorrect." };
  }

  const { error } = await db
    .from("users")
    .update({ password_hash: await hash(parsed.data.newPassword, 10) })
    .eq("id", session.user.id);

  if (error) return { error: error.message };
  return { success: "Password updated." };
}

export async function deleteAllConversations(
  _state: SettingsActionState | null,
  formData: FormData,
): Promise<SettingsActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Your session expired. Sign in again." };
  if (formData.get("confirmation") !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  const { error } = await getSupabase()
    .from("conversations")
    .delete()
    .eq("user_id", session.user.id);

  if (error) return { error: error.message };
  return { success: "All conversations deleted." };
}

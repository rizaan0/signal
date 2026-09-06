"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";

export async function loginWithCredentials(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  return null;
}

export async function loginWithGoogle(formData: FormData) {
  await signIn("google", {
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}

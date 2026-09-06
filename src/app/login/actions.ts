"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";
import { isRedirectError, toUserDbError } from "@/lib/db-errors";

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
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      const cause =
        "cause" in error && error.cause instanceof Error
          ? error.cause.message
          : "";
      if (/Missing |Could not find the table/i.test(cause)) {
        return { error: toUserDbError(error.cause) };
      }
      return { error: "Invalid email or password." };
    }
    return { error: toUserDbError(error) };
  }

  return null;
}

export async function loginWithGoogle(formData: FormData) {
  await signIn("google", {
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}

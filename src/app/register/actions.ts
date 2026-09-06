"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { createPasswordUser } from "@/lib/auth-db";
import { safeCallbackUrl } from "@/lib/callback-url";
import { isRedirectError, toUserDbError } from "@/lib/db-errors";

const registerSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function registerWithCredentials(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const passwordHash = await hash(parsed.data.password, 10);
  let user;
  try {
    user = await createPasswordUser({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    });
  } catch (error) {
    return { error: toUserDbError(error) };
  }

  if (!user) {
    return { error: "An account with this email already exists." };
  }

  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "Account created. Sign in failed — try logging in." };
    }
    return { error: toUserDbError(error) };
  }

  return null;
}

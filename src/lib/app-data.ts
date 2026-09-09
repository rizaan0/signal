import "server-only";
import { getSupabase } from "@/lib/supabase";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  hasPassword: boolean;
};

export type ConversationSummary = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type ThemePreference = "light" | "dark" | "system";
export type ThinkingLevel = "low" | "medium" | "high";

export type UserPreferences = {
  theme: ThemePreference;
  defaultThinkingLevel: ThinkingLevel;
  notifyAgentCompletion: boolean;
  notifyApprovalNeeded: boolean;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  defaultThinkingLevel: "medium",
  notifyAgentCompletion: false,
  notifyApprovalNeeded: false,
};

export function timeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export async function getAppUser(
  userId: string,
  fallback: { name?: string | null; email?: string | null; image?: string | null },
): Promise<AppUser> {
  const { data } = await getSupabase()
    .from("users")
    .select("id, name, email, image, password_hash")
    .eq("id", userId)
    .maybeSingle();

  return {
    id: userId,
    name: data?.name?.trim() || fallback.name?.trim() || fallback.email?.split("@")[0] || "Signal user",
    email: data?.email || fallback.email || "",
    image: data?.image || fallback.image || null,
    hasPassword: Boolean(data?.password_hash),
  };
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const { data, error } = await getSupabase()
    .from("user_preferences")
    .select("theme, default_thinking_level, notify_agent_completion, notify_approval_needed")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_PREFERENCES;

  return {
    theme: data.theme as ThemePreference,
    defaultThinkingLevel: data.default_thinking_level as ThinkingLevel,
    notifyAgentCompletion: Boolean(data.notify_agent_completion),
    notifyApprovalNeeded: Boolean(data.notify_approval_needed),
  };
}

export async function listConversations(
  userId: string,
  limit = 20,
): Promise<ConversationSummary[]> {
  const { data } = await getSupabase()
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as ConversationSummary[];
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAppUser } from "@/lib/app-data";
import { getSupabase } from "@/lib/supabase";
import type { GmailAccount } from "@/components/mail-list";
import { SettingsInterface } from "@/components/settings-interface";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, accountResult] = await Promise.all([
    getAppUser(session.user.id, session.user),
    getSupabase()
      .from("gmail_accounts")
      .select("id, email, is_primary, created_at")
      .eq("user_id", session.user.id)
      .order("is_primary", { ascending: false }),
  ]);

  return (
    <SettingsInterface
      user={user}
      initialAccounts={(accountResult.data ?? []) as GmailAccount[]}
    />
  );
}

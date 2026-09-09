import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAppUser } from "@/lib/app-data";
import { getSupabase } from "@/lib/supabase";
import { ProfileInterface } from "@/components/profile-interface";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, accountResult] = await Promise.all([
    getAppUser(session.user.id, session.user),
    getSupabase()
      .from("gmail_accounts")
      .select("id, email, is_primary")
      .eq("user_id", session.user.id)
      .order("is_primary", { ascending: false }),
  ]);
  const accounts = accountResult.data ?? [];

  return <ProfileInterface user={user} accounts={accounts} />;
}

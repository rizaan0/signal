import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAppUser } from "@/lib/app-data";
import { getSupabase } from "@/lib/supabase";
import { MailIcon, UserIcon } from "@/components/icons";

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

  return (
    <section className="page-container">
      <div className="mb-8">
        <p className="eyebrow">Identity</p>
        <h1 className="page-title">Profile</h1>
        <p className="page-description">Your Signal identity and connected inboxes.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-ui bg-elevated p-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <UserIcon className="size-5" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">{user.name}</h2>
          <p className="mt-1 text-sm text-secondary">{user.email}</p>
          <Link href="/settings" className="button-secondary mt-6 inline-flex">
            Edit profile
          </Link>
        </div>

        <div className="rounded-3xl border border-ui bg-elevated p-6">
          <div className="flex items-center gap-2">
            <MailIcon className="size-5 text-secondary" />
            <h2 className="text-lg font-semibold">Connected Gmail</h2>
          </div>
          <div className="mt-5 space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-secondary">No Gmail account is connected.</p>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="rounded-xl bg-surface px-4 py-3">
                  <p className="truncate text-sm font-medium">{account.email}</p>
                  <p className="mt-0.5 text-xs text-tertiary">
                    {account.is_primary ? "Primary account" : "Connected account"}
                  </p>
                </div>
              ))
            )}
          </div>
          <Link href="/settings" className="button-secondary mt-6 inline-flex">
            Manage accounts
          </Link>
        </div>
      </div>
    </section>
  );
}

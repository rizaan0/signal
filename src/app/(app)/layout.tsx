import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getAppUser,
  getUserPreferences,
  listConversations,
} from "@/lib/app-data";
import { AppShell } from "@/components/app-shell";
import { PreferencesProvider } from "@/components/preferences-provider";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, preferences, conversations] = await Promise.all([
    getAppUser(session.user.id, session.user),
    getUserPreferences(session.user.id),
    listConversations(session.user.id, 5),
  ]);

  return (
    <PreferencesProvider initial={preferences}>
      <AppShell user={user} initialConversations={conversations}>
        {children}
      </AppShell>
    </PreferencesProvider>
  );
}

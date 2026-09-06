import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import { OnboardingFlow } from "./onboarding-flow";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const db = getSupabase();
  const userId = session.user.id;

  // If already has a gmail account and no fresh connect → go to chat
  const { data: gmailAccount } = await db
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const { connected } = await searchParams;

  if (gmailAccount && !connected) {
    redirect("/chat");
  }

  // Determine phase based on query params
  const startPhase = connected === "1" ? "indexing" : "connect";

  return (
    <OnboardingFlow
      email={session.user.email ?? ""}
      startPhase={startPhase}
    />
  );
}

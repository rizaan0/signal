import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  if (session) {
    redirect("/onboarding");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="flex max-w-lg flex-col gap-4">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Flash
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          An email agent you control in plain language.
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Connect Gmail, describe the work, review the plan, then let the agent
          act across your accounts.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login"
          className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="flex h-12 items-center justify-center rounded-full border border-black/[.08] px-6 text-sm font-medium dark:border-white/[.145]"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}

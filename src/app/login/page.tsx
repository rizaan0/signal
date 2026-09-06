import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const next = safeCallbackUrl(callbackUrl);

  if (session) {
    redirect(next);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Use Google or your email to manage your inbox.
        </p>
      </div>
      <LoginForm callbackUrl={next} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No account?{" "}
        <Link href={`/register?callbackUrl=${encodeURIComponent(next)}`} className="underline">
          Create one
        </Link>
      </p>
    </main>
  );
}

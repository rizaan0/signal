import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({
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
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Start with Google or email and password.
        </p>
      </div>
      <RegisterForm callbackUrl={next} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href={`/login?callbackUrl=${encodeURIComponent(next)}`} className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}

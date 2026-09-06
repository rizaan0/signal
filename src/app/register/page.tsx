import { readFile } from "fs/promises";
import { join } from "path";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";
import { isUsersTableReady } from "@/lib/supabase";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  const { callbackUrl } = await searchParams;
  const next = safeCallbackUrl(callbackUrl);

  if (session) {
    redirect(next);
  }

  let tablesReady = false;
  try {
    tablesReady = await isUsersTableReady();
  } catch {
    tablesReady = false;
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  let projectRef = "";
  try {
    projectRef = new URL(supabaseUrl).hostname.split(".")[0] ?? "";
  } catch {
    projectRef = "";
  }
  const setupSql = tablesReady
    ? ""
    : await readFile(join(process.cwd(), "supabase/setup.sql"), "utf8");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Start with Google or email and password.
        </p>
      </div>
      <RegisterForm
        callbackUrl={next}
        tablesReady={tablesReady}
        setupSql={setupSql}
        sqlEditorUrl={
          projectRef
            ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
            : "https://supabase.com/dashboard"
        }
      />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href={`/login?callbackUrl=${encodeURIComponent(next)}`} className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}

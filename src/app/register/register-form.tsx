"use client";

import { useActionState } from "react";
import { loginWithGoogle } from "../login/actions";
import { registerWithCredentials } from "./actions";

export function RegisterForm({
  callbackUrl,
  tablesReady,
  setupSql,
  sqlEditorUrl,
}: {
  callbackUrl: string;
  tablesReady: boolean;
  setupSql: string;
  sqlEditorUrl: string;
}) {
  const [state, action, pending] = useActionState(
    registerWithCredentials,
    null,
  );

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {!tablesReady ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Database tables are not created yet.</p>
          <p className="mt-2">
            Open the{" "}
            <a
              href={sqlEditorUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Supabase SQL editor
            </a>
            , paste the SQL below, click Run, then create your account.
          </p>
          <textarea
            readOnly
            value={setupSql}
            className="mt-3 h-40 w-full rounded-lg border border-amber-200 bg-white p-2 font-mono text-xs text-zinc-800 dark:border-amber-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
      ) : null}
      <form action={loginWithGoogle}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center rounded-full border border-black/[.08] text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Continue with Google
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            name="name"
            type="text"
            autoComplete="name"
            className="h-11 rounded-lg border border-zinc-200 bg-transparent px-3 dark:border-zinc-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-11 rounded-lg border border-zinc-200 bg-transparent px-3 dark:border-zinc-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11 rounded-lg border border-zinc-200 bg-transparent px-3 dark:border-zinc-800"
          />
        </label>
        {state?.error ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}

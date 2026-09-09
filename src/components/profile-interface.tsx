"use client";

import Link from "next/link";
import type { AppUser } from "@/lib/app-data";
import { MailIcon, UserIcon } from "@/components/icons";

export type ConnectedAccount = {
  id: string;
  email: string;
  is_primary: boolean;
};

export function ProfileInterface({
  user,
  accounts,
  embedded = false,
  onOpenAccount,
}: {
  user: AppUser;
  accounts: ConnectedAccount[];
  embedded?: boolean;
  onOpenAccount?: (section: "account" | "gmail") => void;
}) {
  const accountAction = (label: string, section: "account" | "gmail") =>
    onOpenAccount ? (
      <button
        type="button"
        onClick={() => onOpenAccount(section)}
        className="button-secondary mt-6 inline-flex"
      >
        {label}
      </button>
    ) : (
      <Link href="/settings" className="button-secondary mt-6 inline-flex">
        {label}
      </Link>
    );

  return (
    <section className={embedded ? "h-full overflow-y-auto p-5 sm:p-8" : "page-container"}>
      <div className="mb-8">
        <p className="eyebrow">Identity</p>
        <h1 className="page-title">Profile</h1>
        <p className="page-description">Your Signal identity and connected inboxes.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-ui bg-white p-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <UserIcon className="size-5" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">{user.name}</h2>
          <p className="mt-1 text-sm text-secondary">{user.email}</p>
          {accountAction("Edit profile", "account")}
        </div>

        <div className="rounded-3xl border border-ui bg-white p-6">
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
          {accountAction("Manage accounts", "gmail")}
        </div>
      </div>
    </section>
  );
}

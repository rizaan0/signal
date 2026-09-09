"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDownIcon, InboxIcon } from "@/components/icons";

export type GmailAccount = {
  id: string;
  email: string;
  is_primary: boolean;
  created_at: string;
};

export type GmailMessage = {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  labelIds: string[];
};

type InboxStats = {
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
};

export function MailList() {
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [account, setAccount] = useState("");
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInbox = useCallback(async (accountEmail?: string) => {
    setLoading(true);
    setError("");
    try {
      const suffix = accountEmail ? `?account=${encodeURIComponent(accountEmail)}` : "";
      const [messagesResponse, statsResponse] = await Promise.all([
        fetch(`/api/gmail/messages${suffix}`),
        fetch(`/api/gmail/stats${suffix}`),
      ]);
      const messagesBody = (await messagesResponse.json()) as {
        messages?: GmailMessage[];
        error?: string;
      };
      const statsBody = (await statsResponse.json()) as InboxStats & { error?: string };
      if (!messagesResponse.ok) throw new Error(messagesBody.error ?? "Unable to load messages.");
      if (!statsResponse.ok) throw new Error(statsBody.error ?? "Unable to load inbox totals.");
      setMessages(messagesBody.messages ?? []);
      setStats(statsBody);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to load your inbox.";
      setError(`${message} Check your Gmail connection and try again.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const response = await fetch("/api/gmail/accounts");
        const body = (await response.json()) as { accounts?: GmailAccount[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Unable to load Gmail accounts.");
        if (!active) return;
        const loaded = body.accounts ?? [];
        setAccounts(loaded);
        const selected = loaded.find((item) => item.is_primary)?.email ?? loaded[0]?.email ?? "";
        setAccount(selected);
        await loadInbox(selected || undefined);
      } catch (reason) {
        if (active) {
          const message = reason instanceof Error ? reason.message : "Unable to load your inbox.";
          setError(`${message} Check your Gmail connection and try again.`);
          setLoading(false);
        }
      }
    }
    void start();
    return () => {
      active = false;
    };
  }, [loadInbox]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {accounts.length > 1 ? (
          <label className="flex items-center gap-2 text-sm text-secondary">
            Account
            <select
              value={account}
              onChange={(event) => {
                setAccount(event.target.value);
                void loadInbox(event.target.value);
              }}
              className="field min-h-10 py-1.5"
            >
              {accounts.map((item) => (
                <option key={item.id} value={item.email}>{item.email}</option>
              ))}
            </select>
          </label>
        ) : (
          <span className="text-sm text-secondary">{accounts[0]?.email}</span>
        )}
        <button
          type="button"
          onClick={() => void loadInbox(account || undefined)}
          disabled={loading}
          className="button-secondary ms-auto"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {stats ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Messages", stats.messagesTotal],
            ["Unread", stats.messagesUnread],
            ["Threads", stats.threadsTotal],
            ["Unread threads", stats.threadsUnread],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-ui bg-elevated p-4">
              <p className="text-xs text-tertiary">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <p role="alert" className="mt-3 min-h-5 text-sm text-danger">{error}</p>
      <p aria-live="polite" className="sr-only">
        {loading ? "Loading inbox." : `Inbox loaded with ${messages.length} messages.`}
      </p>

      <div className="mt-2 overflow-hidden rounded-2xl border border-ui bg-elevated">
        {loading && messages.length === 0 ? (
          <p className="p-8 text-center text-sm text-secondary">Loading inbox…</p>
        ) : messages.length === 0 ? (
          <div className="p-10 text-center">
            <InboxIcon className="mx-auto size-6 text-tertiary" />
            <p className="mt-3 font-medium">No inbox messages</p>
            <p className="mt-1 text-sm text-secondary">Refresh to check for new mail.</p>
            <button
              type="button"
              onClick={() => void loadInbox(account || undefined)}
              className="button-secondary mt-4"
            >
              Refresh inbox
            </button>
          </div>
        ) : (
          messages.map((message) => (
            <details key={message.id} className="group border-b border-border-subtle last:border-b-0">
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 px-4 py-3 hover:bg-surface-hover">
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    message.labelIds.includes("UNREAD") ? "bg-accent-solid" : "bg-border-strong"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span title={message.subject || "(no subject)"} className="block truncate text-sm font-medium">
                    {message.subject || "(no subject)"}
                  </span>
                  <span title={message.from} className="mt-0.5 block truncate text-xs text-secondary">{message.from}</span>
                </span>
                {message.labelIds.includes("UNREAD") ? (
                  <span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-medium text-accent">
                    Unread
                  </span>
                ) : null}
                <time className="hidden shrink-0 text-xs text-tertiary sm:block">
                  {message.date ? new Date(message.date).toLocaleDateString() : ""}
                </time>
                <ChevronDownIcon className="size-4 shrink-0 text-tertiary transition-transform duration-150 group-open:rotate-180" />
              </summary>
              <div className="bg-surface px-6 py-4 text-sm leading-6 text-secondary">
                <p className="font-medium text-primary">{message.subject || "(no subject)"}</p>
                <p className="mt-1 text-xs">From: {message.from}</p>
                <p className="mt-3">{message.snippet || "No preview is available."}</p>
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

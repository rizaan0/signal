"use client";

import Link from "next/link";
import { useState } from "react";
import type { ConversationSummary } from "@/lib/app-data";
import { SearchIcon } from "@/components/icons";
import { SmoothInput } from "@/components/ui comp/skiper106";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(value).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(new Date(value));
}

export function ConversationList({
  initial,
}: {
  initial: ConversationSummary[];
}) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/conversations?q=${encodeURIComponent(query)}`);
      const body = (await response.json()) as {
        conversations?: ConversationSummary[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Unable to search conversations.");
      setItems(body.conversations ?? []);
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Unable to search conversations.";
      setError(`${message} Check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={search} role="search" className="relative max-w-xl">
        <label htmlFor="conversation-search" className="sr-only">
          Search conversations
        </label>
        <SearchIcon className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
        <SmoothInput
          id="conversation-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversation history"
          autoComplete="off"
          spellCheck={false}
          className="field min-h-12 w-full ps-11 pe-24"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute end-1 top-1 min-h-10 rounded-lg bg-ink px-3 text-xs font-medium text-ink-inverse disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      <p role="alert" className="mt-2 min-h-5 text-sm text-danger">{error}</p>
      <p aria-live="polite" className="sr-only">
        {loading ? "Searching conversations." : `${items.length} conversations shown.`}
      </p>

      <div className="mt-5 grid gap-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-ui bg-elevated p-8 text-center">
            <p className="font-medium">No conversations found</p>
            <p className="mt-1 text-sm text-secondary">
              Start a new chat or try a different search.
            </p>
            <Link href="/chat" className="button-secondary mt-4 inline-flex">Start a new chat</Link>
          </div>
        ) : (
          items.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/chat/${conversation.id}`}
              className="group flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-ui bg-elevated px-4 py-3 transition-[border-color,background-color] duration-150 hover:border-strong hover:bg-surface-hover"
            >
              <span className="min-w-0">
                <span className="block break-words text-sm font-medium">
                  {conversation.title || "Untitled conversation"}
                </span>
                <span className="mt-1 block text-xs text-tertiary">
                  Updated {formatDate(conversation.updated_at)}
                </span>
              </span>
              <span aria-hidden="true" className="text-secondary transition-transform duration-150 group-hover:translate-x-0.5">→</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

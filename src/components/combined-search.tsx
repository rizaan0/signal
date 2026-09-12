"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { ConversationSummary } from "@/lib/app-data";
import type { GmailMessage } from "@/components/mail-list";
import { ChevronDownIcon, HistoryIcon, MailIcon, SearchIcon } from "@/components/icons";
import { SmoothInput } from "@/components/ui comp/skiper106";

export function CombinedSearch() {
  const [query, setQuery] = useState("");
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [conversationError, setConversationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      setFormError("Enter a sender, subject, or phrase to search.");
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setFormError("");
    setEmailError("");
    setConversationError("");
    setSearched(true);

    try {
      const [emailResponse, conversationResponse] = await Promise.all([
        fetch(`/api/gmail/messages?q=${encodeURIComponent(value)}&max=20`),
        fetch(`/api/conversations?q=${encodeURIComponent(value)}`),
      ]);
      const emailBody = (await emailResponse.json()) as {
        messages?: GmailMessage[];
        error?: string;
      };
      const conversationBody = (await conversationResponse.json()) as {
        conversations?: ConversationSummary[];
        error?: string;
      };
      if (emailResponse.ok) {
        setEmails(emailBody.messages ?? []);
      } else {
        setEmails([]);
        setEmailError(`${emailBody.error ?? "Unable to search Gmail."} Check your Gmail connection and try again.`);
      }
      if (conversationResponse.ok) {
        setConversations(conversationBody.conversations ?? []);
      } else {
        setConversations([]);
        setConversationError(
          `${conversationBody.error ?? "Unable to search conversations."} Check your connection and try again.`,
        );
      }
    } catch {
      setEmails([]);
      setConversations([]);
      setEmailError("Unable to search Gmail. Check your connection and try again.");
      setConversationError("Unable to search conversations. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={search} role="search" className="relative max-w-2xl">
        <label htmlFor="global-search" className="sr-only">
          Search Gmail and conversations
        </label>
        <SearchIcon className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-tertiary" />
        <SmoothInput
          ref={inputRef}
          id="global-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (formError) setFormError("");
          }}
          placeholder="Search email and conversations"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(formError)}
          aria-describedby="global-search-error"
          className="field min-h-12 w-full ps-12 pe-24 text-base sm:text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute end-1 top-1 min-h-10 rounded-xl bg-ink px-4 text-sm font-medium text-ink-inverse disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      <p id="global-search-error" role="alert" className="mt-2 min-h-5 text-sm text-danger">
        {formError}
      </p>
      <p aria-live="polite" className="sr-only">
        {loading
          ? "Searching Gmail and conversations."
          : searched
            ? `Search complete. ${emails.length} email results and ${conversations.length} conversation results.`
            : ""}
      </p>

      {!searched ? (
        <div className="mt-12 max-w-xl rounded-2xl border border-ui bg-elevated p-8 text-center">
          <SearchIcon className="mx-auto size-6 text-tertiary" />
          <p className="mt-3 font-medium">Search everything in one place</p>
          <p className="mt-1 text-sm leading-6 text-secondary">
            Find Gmail messages and past Signal conversations.
          </p>
        </div>
      ) : !loading &&
        !emailError &&
        !conversationError &&
        emails.length === 0 &&
        conversations.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-ui bg-elevated p-8 text-center">
          <p className="font-medium">No results for “{query}”</p>
          <p className="mt-1 text-sm text-secondary">Try a sender, subject, or phrase from a chat.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSearched(false);
              inputRef.current?.focus();
            }}
            className="button-secondary mt-4"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 xl:grid-cols-2">
          <section aria-labelledby="email-results">
            <div className="mb-3 flex items-center gap-2">
              <MailIcon className="size-4 text-secondary" />
              <h2 id="email-results" className="font-semibold">Email</h2>
              <span className="text-xs tabular-nums text-tertiary">{emails.length}</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-ui bg-elevated">
              {emailError ? (
                <p role="alert" className="p-6 text-sm text-danger">{emailError}</p>
              ) : emails.length === 0 ? (
                <p className="p-6 text-sm text-secondary">No matching Gmail messages.</p>
              ) : (
                emails.map((message) => (
                  <details key={message.id} className="group border-b border-border-subtle last:border-0">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-surface-hover">
                      <span className="min-w-0 flex-1">
                        <span title={message.subject || "(no subject)"} className="block truncate text-sm font-medium">
                          {message.subject || "(no subject)"}
                        </span>
                        <span title={message.from} className="mt-1 block truncate text-xs text-secondary">{message.from}</span>
                      </span>
                      <ChevronDownIcon className="size-4 shrink-0 text-tertiary transition-transform duration-150 group-open:rotate-180" />
                    </summary>
                    <div className="bg-surface px-4 py-3 text-sm leading-6 text-secondary">
                      <p className="break-words font-medium text-primary">{message.subject || "(no subject)"}</p>
                      <p className="mt-2 break-words">{message.snippet}</p>
                    </div>
                  </details>
                ))
              )}
            </div>
          </section>

          <section aria-labelledby="conversation-results">
            <div className="mb-3 flex items-center gap-2">
              <HistoryIcon className="size-4 text-secondary" />
              <h2 id="conversation-results" className="font-semibold">Conversations</h2>
              <span className="text-xs tabular-nums text-tertiary">{conversations.length}</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-ui bg-elevated">
              {conversationError ? (
                <p role="alert" className="p-6 text-sm text-danger">{conversationError}</p>
              ) : conversations.length === 0 ? (
                <p className="p-6 text-sm text-secondary">No matching Signal conversations.</p>
              ) : (
                conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/chat/${conversation.id}`}
                    className="block border-b border-border-subtle px-4 py-3 text-sm font-medium hover:bg-surface-hover last:border-0"
                  >
                    {conversation.title || "Untitled conversation"}
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

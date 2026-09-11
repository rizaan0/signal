"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppUser, ThinkingLevel } from "@/lib/app-data";
import type { GmailAccount } from "@/components/mail-list";
import {
  BellIcon,
  CloseIcon,
  MailIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/icons";
import { usePreferences } from "@/components/preferences-provider";
import {
  deleteAllConversations,
  saveDisplayName,
} from "@/app/(app)/settings/actions";
import { logOut } from "@/app/(app)/actions";
import { GlassButton } from "@/components/ui/glass-button";
import { THINKING_LEVEL_COPY } from "@/lib/model-display";

export type SettingsSection = "account" | "gmail" | "notifications" | "privacy";

const SECTIONS = [
  { id: "account" as const, label: "Account", icon: UserIcon },
  { id: "gmail" as const, label: "Gmail", icon: MailIcon },
  { id: "notifications" as const, label: "Notifications", icon: BellIcon },
  { id: "privacy" as const, label: "Privacy", icon: ShieldIcon },
];

function ActionMessage({
  id,
  state,
}: {
  id: string;
  state: { error?: string; success?: string } | null;
}) {
  return (
    <p
      id={id}
      role={state?.error ? "alert" : "status"}
      className={`min-h-5 text-sm ${state?.error ? "text-danger" : "text-success"}`}
    >
      {state?.error ?? state?.success ?? ""}
    </p>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-5 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-sm text-secondary">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="toggle"
      />
    </label>
  );
}

export function SettingsInterface({
  user,
  initialAccounts,
  embedded = false,
  initialSection = "account",
  onClose,
  showClose = true,
}: {
  user: AppUser;
  initialAccounts: GmailAccount[];
  embedded?: boolean;
  initialSection?: SettingsSection;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [disconnectCandidate, setDisconnectCandidate] = useState<GmailAccount | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [preferenceError, setPreferenceError] = useState("");
  const [gmailError, setGmailError] = useState("");
  const [displayState, displayAction, displayPending] = useActionState(saveDisplayName, null);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAllConversations, null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const deleteConfirmationRef = useRef<HTMLInputElement>(null);
  const disconnectDialogRef = useRef<HTMLDialogElement>(null);
  const { preferences, setThinkingLevel, setNotificationPreference } =
    usePreferences();
  const router = useRouter();

  useEffect(() => {
    if (displayState?.success) router.refresh();
    if (displayState?.error) nameInputRef.current?.focus();
  }, [displayState, router]);

  useEffect(() => {
    if (deleteState?.success) {
      window.dispatchEvent(new Event("signal:conversations-changed"));
      if (embedded) onClose?.();
      else router.push("/chat");
      router.refresh();
    }
    if (deleteState?.error) deleteConfirmationRef.current?.focus();
  }, [deleteState, embedded, onClose, router]);

  async function updateReasoning(level: ThinkingLevel) {
    setPreferenceError("");
    try {
      await setThinkingLevel(level);
    } catch (reason) {
      setPreferenceError(reason instanceof Error ? reason.message : "Unable to save reasoning level.");
    }
  }

  async function updateNotification(
    key: "notifyAgentCompletion" | "notifyApprovalNeeded",
    enabled: boolean,
  ) {
    setPreferenceError("");
    if (enabled) {
      if (!("Notification" in window)) {
        setPreferenceError("Browser notifications are not supported here.");
        return;
      }
      const permission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
      if (permission !== "granted") {
        setPreferenceError(
          "Notifications are blocked. Allow them in your browser site settings and try again.",
        );
        return;
      }
    }
    try {
      await setNotificationPreference(key, enabled);
    } catch (reason) {
      setPreferenceError(
        reason instanceof Error ? reason.message : "Unable to save notification preference.",
      );
    }
  }

  async function connectGmail() {
    setGmailError("");
    const response = await fetch("/api/gmail/connect", { method: "POST" });
    const body = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!response.ok || !body.url) {
      setGmailError(
        `${body.error ?? "Unable to start Gmail connection."} Check your connection and try again.`,
      );
      return;
    }
    window.location.assign(body.url);
  }

  function askToDisconnect(account: GmailAccount) {
    setGmailError("");
    setDisconnectCandidate(account);
    requestAnimationFrame(() => disconnectDialogRef.current?.showModal());
  }

  async function disconnect(account: GmailAccount) {
    setGmailError("");
    setDisconnecting(true);
    const response = await fetch(`/api/gmail/accounts/${account.id}`, {
      method: "DELETE",
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      remaining?: number;
    };
    if (!response.ok) {
      setGmailError(
        `${body.error ?? "Unable to disconnect Gmail."} Check your connection and try again.`,
      );
      setDisconnecting(false);
      return;
    }
    const next = accounts.filter((item) => item.id !== account.id);
    setAccounts(next);
    disconnectDialogRef.current?.close();
    setDisconnecting(false);
    if ((body.remaining ?? next.length) === 0) router.push("/onboarding");
    else router.refresh();
  }

  return (
    <section
      className={
        embedded
          ? "h-full min-h-0"
          : "flex min-h-full items-center justify-center p-3 sm:p-6"
      }
    >
      <dialog
        ref={disconnectDialogRef}
        aria-labelledby="disconnect-gmail-title"
        onCancel={(event) => {
          if (disconnecting) event.preventDefault();
        }}
        onClose={() => {
          setDisconnectCandidate(null);
          setDisconnecting(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !disconnecting) {
            event.currentTarget.close();
          }
        }}
        className="on-white-surface m-auto w-[calc(100%_-_2rem)] max-w-md rounded-3xl border border-ui bg-white p-0 text-primary shadow-panel backdrop:bg-overlay"
      >
        <div className="p-6">
          <h2 id="disconnect-gmail-title" className="text-lg font-semibold">
            Disconnect Gmail?
          </h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Signal will no longer be able to access{" "}
            <strong className="font-medium text-primary">{disconnectCandidate?.email}</strong>.
            Your Gmail messages will not be deleted.
          </p>
          <p role="alert" className="mt-3 min-h-5 text-sm text-danger">{gmailError}</p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              autoFocus
              disabled={disconnecting}
              onClick={() => disconnectDialogRef.current?.close()}
              className="button-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disconnecting || !disconnectCandidate}
              onClick={() => {
                if (disconnectCandidate) void disconnect(disconnectCandidate);
              }}
              className="button-danger"
            >
              {disconnecting ? "Disconnecting Gmail…" : "Disconnect Gmail"}
            </button>
          </div>
        </div>
      </dialog>

      <div
        className={
          embedded
            ? "flex h-full min-h-0 w-full overflow-hidden bg-transparent"
            : "flex min-h-[min(44rem,calc(100dvh-3rem))] w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-ui bg-elevated shadow-panel"
        }
      >
        <aside className={`hidden w-52 shrink-0 flex-col p-3 md:flex ${embedded ? "bg-white" : "bg-sidebar"}`}>
          <p className="px-3 py-2 text-xs text-tertiary">Settings</p>
          <nav aria-label="Settings sections" className="space-y-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <GlassButton
                key={id}
                type="button"
                size="nav"
                className="w-full"
                onClick={() => setSection(id)}
                aria-current={section === id ? "page" : undefined}
                contentClassName={section === id ? "font-semibold" : undefined}
              >
                <Icon className="size-4" />
                {label}
              </GlassButton>
            ))}
          </nav>
          <form action={logOut} className="mt-auto">
            <GlassButton type="submit" size="sm" wrapperClassName="w-full" className="w-full">
              Log out
            </GlassButton>
          </form>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex min-h-16 items-center justify-between border-b border-ui px-5 sm:px-8">
            <h1 className="text-lg font-semibold">
              {SECTIONS.find((item) => item.id === section)?.label}
            </h1>
            {showClose ? (
              <button
                type="button"
                aria-label="Close settings"
                onClick={() => {
                  if (onClose) onClose();
                  else router.back();
                }}
                className="flex size-10 items-center justify-center rounded-full bg-white text-primary"
              >
                <CloseIcon className="size-4" />
              </button>
            ) : null}
          </header>

          <nav aria-label="Settings sections" className="border-b border-ui p-2 md:hidden">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {SECTIONS.map(({ id, label }) => (
                <GlassButton
                  key={id}
                  type="button"
                  size="nav"
                  className="w-full"
                  aria-current={section === id ? "page" : undefined}
                  onClick={() => setSection(id)}
                  contentClassName={`justify-center px-3 ${section === id ? "font-semibold" : ""}`}
                >
                  {label}
                </GlassButton>
              ))}
            </div>
          </nav>

          <div className="p-5 sm:p-8">
            {section === "account" ? (
              <div className="max-w-2xl space-y-8">
                <form action={displayAction} className="settings-group">
                  <div>
                    <h2 className="section-title">Account details</h2>
                    <p className="section-description">Update the name shown throughout Signal.</p>
                  </div>
                  <label className="form-label">
                    Display name
                    <input
                      ref={nameInputRef}
                      name="name"
                      defaultValue={user.name}
                      autoComplete="name"
                      required
                      maxLength={80}
                      aria-invalid={Boolean(displayState?.error)}
                      aria-describedby="display-name-message"
                      className="field"
                    />
                  </label>
                  <label className="form-label">
                    Email
                    <input
                      name="email"
                      type="email"
                      value={user.email}
                      autoComplete="email"
                      spellCheck={false}
                      readOnly
                      className="field bg-surface text-secondary"
                    />
                  </label>
                  <ActionMessage id="display-name-message" state={displayState} />
                  <GlassButton type="submit" size="sm" disabled={displayPending} wrapperClassName="self-start">
                    {displayPending ? "Saving…" : "Save name"}
                  </GlassButton>
                </form>

                <div className="settings-group">
                  <div>
                    <h2 className="section-title">Default reasoning</h2>
                    <p className="section-description">Used for new agent requests unless you override it.</p>
                  </div>
                  <div className="segmented-control" role="group" aria-label="Default reasoning level">
                    {(["low", "medium", "high"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={preferences.defaultThinkingLevel === level}
                        onClick={() => void updateReasoning(level)}
                      >
                        {THINKING_LEVEL_COPY[level].label}
                      </button>
                    ))}
                  </div>
                  <p role="alert" className="min-h-5 text-sm text-danger">{preferenceError}</p>
                </div>
              </div>
            ) : null}

            {section === "gmail" ? (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h2 className="section-title">Gmail connections</h2>
                  <p className="section-description">Accounts Signal can read and manage with your approval.</p>
                </div>
                <div className="divide-y divide-border-subtle rounded-2xl border border-ui">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex flex-wrap items-center gap-3 p-4">
                      <MailIcon className="size-5 text-secondary" />
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-sm font-medium">{account.email}</p>
                        <p className="text-xs text-tertiary">{account.is_primary ? "Primary account" : "Connected account"}</p>
                      </div>
                      <button type="button" onClick={() => askToDisconnect(account)} className="button-text-danger">
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
                <GlassButton type="button" size="sm" onClick={() => void connectGmail()} wrapperClassName="self-start">
                  Connect another account
                </GlassButton>
                <p role="alert" className="min-h-5 text-sm text-danger">{gmailError}</p>
              </div>
            ) : null}

            {section === "notifications" ? (
              <div className="max-w-2xl divide-y divide-border-subtle">
                <Toggle
                  checked={preferences.notifyAgentCompletion}
                  onChange={(enabled) => void updateNotification("notifyAgentCompletion", enabled)}
                  label="Agent completion"
                  description="Notify you when Signal finishes a request while this browser is open."
                />
                <Toggle
                  checked={preferences.notifyApprovalNeeded}
                  onChange={(enabled) => void updateNotification("notifyApprovalNeeded", enabled)}
                  label="Approval needed"
                  description="Notify you when an action is waiting for confirmation."
                />
                <p role="alert" className="pt-4 text-sm text-danger">{preferenceError}</p>
              </div>
            ) : null}

            {section === "privacy" ? (
              <div className="max-w-2xl space-y-8">
                <div>
                  <h2 className="section-title">Your data</h2>
                  <p className="section-description">
                    Signal stores conversation history and encrypted Gmail tokens to provide the agent.
                  </p>
                  <a href="/privacy" className="mt-3 inline-block text-sm text-accent hover:underline">
                    Read the Privacy Policy
                  </a>
                </div>
                <form action={deleteAction} className="rounded-2xl border border-danger-soft bg-danger-soft p-4">
                  <h2 className="section-title text-danger">Delete all conversations</h2>
                  <p className="mt-1 text-sm leading-6 text-secondary">
                    This permanently removes your Signal chat history. Gmail messages are not affected.
                  </p>
                  <label className="form-label mt-4">
                    Type DELETE to confirm
                    <input
                      ref={deleteConfirmationRef}
                      name="confirmation"
                      className="field max-w-xs"
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={Boolean(deleteState?.error)}
                      aria-describedby="delete-conversations-message"
                    />
                  </label>
                  <ActionMessage id="delete-conversations-message" state={deleteState} />
                  <GlassButton type="submit" size="sm" tone="danger" disabled={deletePending} wrapperClassName="mt-4 self-start">
                    {deletePending ? "Deleting…" : "Delete all conversations"}
                  </GlassButton>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

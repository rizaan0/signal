"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AppUser } from "@/lib/app-data";
import type { GmailAccount } from "@/components/mail-list";
import type { SettingsSection } from "@/components/settings-interface";
import { CloseIcon } from "@/components/icons";
import { HelpInterface } from "@/components/help-interface";
import { LiquidPresence } from "@/components/liquid-presence";
import { ProfileInterface } from "@/components/profile-interface";
import { SettingsInterface } from "@/components/settings-interface";
import { SquircleSurface } from "@/components/ui comp/skiper63";
import {
  liquidEnter,
  liquidIdle,
  liquidLeave,
  liquidMorphTransition,
  liquidReducedTransition,
} from "@/lib/liquid-motion";

export type AppModalView =
  | { kind: "profile" }
  | { kind: "account"; section?: SettingsSection }
  | { kind: "help" };

type AccountsState =
  | { status: "idle" | "loading"; accounts: GmailAccount[]; error: "" }
  | { status: "ready"; accounts: GmailAccount[]; error: "" }
  | { status: "error"; accounts: GmailAccount[]; error: string };

export function AppModal({
  view,
  user,
  onClose,
  onChangeView,
}: {
  view: AppModalView | null;
  user: AppUser;
  onClose: () => void;
  onChangeView: (view: AppModalView) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();
  const [reloadKey, setReloadKey] = useState(0);
  const [accountsState, setAccountsState] = useState<AccountsState>({
    status: "idle",
    accounts: [],
    error: "",
  });
  const [active, setActive] = useState(view);
  if (view && view !== active) {
    setActive(view);
  }
  const needsAccounts = active?.kind === "profile" || active?.kind === "account";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (view && !dialog.open) dialog.showModal();
  }, [view]);

  useEffect(() => {
    if (!needsAccounts) return;
    const controller = new AbortController();

    void fetch("/api/gmail/accounts", { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          accounts?: GmailAccount[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error || "Unable to load connected Gmail accounts.");
        }
        setAccountsState({
          status: "ready",
          accounts: body.accounts ?? [],
          error: "",
        });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setAccountsState({
          status: "error",
          accounts: [],
          error:
            reason instanceof Error
              ? reason.message
              : "Unable to load connected Gmail accounts.",
        });
      });

    return () => controller.abort();
  }, [needsAccounts, reloadKey, active?.kind]);

  const title =
    active?.kind === "profile" ? "Profile" : active?.kind === "account" ? "Account" : "Help";
  const wide = active?.kind === "account";
  const enter = reduceMotion ? liquidReducedTransition : liquidMorphTransition;

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (view) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`liquid-morph on-white-surface fixed inset-0 m-auto h-[min(52rem,calc(100dvh-2rem))] w-[calc(100%_-_2rem)] overflow-visible border-0 bg-transparent p-3 text-primary backdrop:bg-overlay backdrop:backdrop-blur-sm ${
        wide ? "max-w-6xl" : "max-w-4xl"
      }`}
    >
      <AnimatePresence
        initial={false}
        onExitComplete={() => {
          dialogRef.current?.close();
        }}
      >
        {view ? (
          <motion.div
            key="app-modal-surface"
            className="h-full w-full"
            initial={reduceMotion ? false : liquidEnter}
            animate={liquidIdle}
            exit={
              reduceMotion
                ? { opacity: 0, transition: liquidReducedTransition }
                : liquidLeave
            }
            transition={enter}
            layout
            style={{ transformOrigin: "50% 42%" }}
          >
            <SquircleSurface
              className="h-full w-full"
              contentClassName="squircle-black-text h-full min-h-0 overflow-hidden"
              surfaceClassName="bg-white"
              seedRadius={20}
              blurValue={8}
              colorMatrixValue={20}
              alphaValue={-7}
            >
              <button
                type="button"
                aria-label={`Close ${title.toLowerCase()}`}
                onClick={onClose}
                className="absolute end-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white text-primary"
              >
                <CloseIcon className="size-4" />
              </button>

              <LiquidPresence
                id={active?.kind ?? "closed"}
                className="h-full min-h-0"
              >
                {needsAccounts &&
                (accountsState.status === "idle" || accountsState.status === "loading") ? (
                  <div className="flex h-full items-center justify-center p-8 text-sm text-secondary" role="status">
                    Loading {title.toLowerCase()}…
                  </div>
                ) : null}

                {needsAccounts && accountsState.status === "error" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                    <p role="alert" className="text-sm text-danger">{accountsState.error}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountsState({ status: "loading", accounts: [], error: "" });
                        setReloadKey((key) => key + 1);
                      }}
                      className="button-secondary"
                    >
                      Try again
                    </button>
                  </div>
                ) : null}

                {active?.kind === "profile" && accountsState.status === "ready" ? (
                  <ProfileInterface
                    user={user}
                    accounts={accountsState.accounts}
                    embedded
                    onOpenAccount={(section) => onChangeView({ kind: "account", section })}
                  />
                ) : null}

                {active?.kind === "account" && accountsState.status === "ready" ? (
                  <SettingsInterface
                    key={active.section ?? "account"}
                    user={user}
                    initialAccounts={accountsState.accounts}
                    initialSection={active.section}
                    embedded
                    onClose={onClose}
                    showClose={false}
                  />
                ) : null}

                {active?.kind === "help" ? (
                  <HelpInterface
                    embedded
                    onOpenAccount={() => onChangeView({ kind: "account" })}
                  />
                ) : null}
              </LiquidPresence>
            </SquircleSurface>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AppUser } from "@/lib/app-data";
import type { AppModalView } from "@/components/app-modal";
import {
  ChevronDownIcon,
  HelpIcon,
  LogoutIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/icons";
import { logOut } from "@/app/(app)/actions";
import {
  liquidEnter,
  liquidIdle,
  liquidLeave,
  liquidMorphTransition,
  liquidReducedTransition,
} from "@/lib/liquid-motion";
import { GlassButton } from "@/components/ui/glass-button";

export function ProfileMenu({
  user,
  onNavigate,
  onOpenModal,
}: {
  user: AppUser;
  onNavigate?: () => void;
  onOpenModal: (view: AppModalView) => void;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? liquidReducedTransition : liquidMorphTransition;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    popoverRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function navigated() {
    setOpen(false);
    onNavigate?.();
  }

  function openModal(view: AppModalView) {
    navigated();
    onOpenModal(view);
  }

  return (
    <div ref={rootRef} className="on-white-surface relative text-primary">
      <GlassButton
        ref={buttonRef}
        type="button"
        size="nav"
        className="w-full"
        style={{ paddingInlineStart: "1.75rem", paddingInlineEnd: "1.15rem" }}
        aria-haspopup="true"
        aria-controls="account-popover"
        aria-expanded={open}
        aria-label={user.name.trim() || "Account menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span title={user.name} className="min-w-0 flex-1 truncate text-start text-sm font-medium">
          {user.name.trim() || "Account"}
        </span>
        <ChevronDownIcon className={`size-4 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </GlassButton>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            ref={popoverRef}
            id="account-popover"
            aria-label="Account options"
            className="absolute inset-x-0 bottom-[calc(100%+0.55rem)] rounded-[1.15rem] border border-ui bg-white p-1.5 text-primary shadow-menu"
            initial={reduceMotion ? false : liquidEnter}
            animate={liquidIdle}
            exit={
              reduceMotion
                ? { opacity: 0, transition: liquidReducedTransition }
                : liquidLeave
            }
            transition={transition}
            style={{ transformOrigin: "50% 100%" }}
          >
          <button
            type="button"
            onClick={() => openModal({ kind: "profile" })}
            className="menu-item w-full"
          >
            <UserIcon className="size-4" />
            Profile
          </button>
          <button
            type="button"
            onClick={() => openModal({ kind: "account" })}
            className="menu-item w-full"
          >
            <SettingsIcon className="size-4" />
            Account
          </button>
          <button
            type="button"
            onClick={() => openModal({ kind: "help" })}
            className="menu-item w-full"
          >
            <HelpIcon className="size-4" />
            Help
          </button>
          <div className="my-1 h-px bg-border-subtle" />
          <form action={logOut}>
            <button type="submit" className="menu-item w-full text-danger">
              <LogoutIcon className="size-4" />
              Log out
            </button>
          </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </div>
  );
}

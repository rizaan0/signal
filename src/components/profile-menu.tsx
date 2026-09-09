"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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

function initials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "S";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-controls="account-popover"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-14 w-full items-center gap-3 rounded-[1.1rem] bg-transparent p-2 text-start transition-[scale] duration-150 active:scale-[0.96]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-solid text-sm font-semibold text-accent-contrast outline outline-1 outline-black/10 dark:outline-white/10">
          {user.image ? (
            <Image src={user.image} alt="" width={40} height={40} unoptimized />
          ) : (
            initials(user.name, user.email)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span title={user.name} className="block truncate text-sm font-medium">{user.name}</span>
          <span title={user.email} className="block truncate text-xs text-primary">{user.email}</span>
        </span>
        <ChevronDownIcon className={`size-4 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          ref={popoverRef}
          id="account-popover"
          aria-label="Account options"
          className="absolute inset-x-0 bottom-[calc(100%+0.55rem)] rounded-[1.15rem] border border-ui bg-white p-1.5 text-primary shadow-menu"
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
        </div>
      ) : null}

    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { AppUser, ConversationSummary } from "@/lib/app-data";
import { AppSidebar } from "@/components/app-sidebar";
import { CloseIcon, MenuIcon } from "@/components/icons";

export function AppShell({
  user,
  initialConversations,
  children,
}: {
  user: AppUser;
  initialConversations: ConversationSummary[];
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState(initialConversations);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousPathRef = useRef("");
  const pathname = usePathname();

  useEffect(() => {
    async function refresh() {
      const response = await fetch("/api/conversations");
      if (!response.ok) return;
      const body = (await response.json()) as {
        conversations?: ConversationSummary[];
      };
      setConversations(body.conversations ?? []);
    }
    const listener = () => void refresh();
    window.addEventListener("signal:conversations-changed", listener);
    return () => window.removeEventListener("signal:conversations-changed", listener);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) dialog.showModal();
    if (!drawerOpen && dialog.open) dialog.close();
  }, [drawerOpen]);

  useEffect(() => {
    if (!previousPathRef.current) {
      previousPathRef.current = pathname;
      return;
    }
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;

    const label =
      pathname.startsWith("/chat/")
        ? "Conversation"
        : pathname === "/chat"
          ? "New chat"
          : pathname.split("/")[1]?.replace(/-/g, " ") || "Signal";
    document.title = `${label[0]?.toUpperCase()}${label.slice(1)} · Signal`;

    requestAnimationFrame(() => {
      const main = document.getElementById("main-content");
      const heading = main?.querySelector<HTMLElement>("h1");
      const target = heading ?? main;
      if (!target) return;
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
      main?.scrollTo({ top: 0 });
    });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-app">
      <a href="#main-content" className="skip-link">Skip to content</a>

      <aside className="hidden w-[17rem] shrink-0 border-e border-ui bg-sidebar lg:block">
        <AppSidebar user={user} conversations={conversations} />
      </aside>

      <dialog
        ref={dialogRef}
        aria-label="Navigation"
        onClose={() => {
          setDrawerOpen(false);
          menuButtonRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close();
          }
        }}
        className="fixed inset-y-0 start-0 m-0 h-dvh max-h-none w-[min(19rem,88vw)] max-w-none overscroll-contain border-0 border-e border-ui bg-sidebar p-0 text-primary shadow-drawer backdrop:bg-overlay lg:hidden"
      >
        <aside aria-label="Mobile navigation" className="relative h-full pt-12">
          <button
            type="button"
            aria-label="Close navigation"
            autoFocus
            onClick={() => {
              dialogRef.current?.close();
            }}
            className="absolute end-3 top-3 z-10 flex size-10 items-center justify-center rounded-full hover:bg-surface-hover"
          >
            <CloseIcon className="size-5" />
          </button>
          <AppSidebar
            user={user}
            conversations={conversations}
            onNavigate={() => {
                setDrawerOpen(false);
              dialogRef.current?.close();
            }}
          />
        </aside>
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-ui bg-elevated px-3 lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="flex size-10 items-center justify-center rounded-full hover:bg-surface-hover"
          >
            <MenuIcon className="size-5" />
          </button>
          <span className="ms-2 text-sm font-semibold">Signal</span>
        </header>
        <main id="main-content" className="min-h-0 flex-1 overflow-auto outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

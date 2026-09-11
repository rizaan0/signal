"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { AppUser, ConversationSummary } from "@/lib/app-data";
import { AppModal, type AppModalView } from "@/components/app-modal";
import { AppSidebar } from "@/components/app-sidebar";
import { MenuIcon } from "@/components/icons";
import { SquircleSurface } from "@/components/ui comp/skiper63";
import { liquidReducedTransition, liquidSurfaceTransition } from "@/lib/liquid-motion";
import { motion, useReducedMotion } from "framer-motion";

const SIDEBAR_WIDTH = "17rem";
const SIDEBAR_STORAGE_KEY = "signal-sidebar";
const SIDEBAR_EVENT = "signal:sidebar-state";

function subscribeToSidebarState(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SIDEBAR_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SIDEBAR_EVENT, onChange);
  };
}

function readSidebarState() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "closed";
  } catch {
    return true;
  }
}

export function AppShell({
  user,
  initialConversations,
  children,
}: {
  user: AppUser;
  initialConversations: ConversationSummary[];
  children: React.ReactNode;
}) {
  const desktopOpen = useSyncExternalStore(
    subscribeToSidebarState,
    readSidebarState,
    () => true,
  );
  const reduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [appModalView, setAppModalView] = useState<AppModalView | null>(null);
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

  function setSidebarOpen(open: boolean) {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? "open" : "closed");
      window.dispatchEvent(new Event(SIDEBAR_EVENT));
    } catch {
      // Keep the current state if storage is unavailable.
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    dialogRef.current?.close();
  }

  const closeAppModal = useCallback(() => {
    setAppModalView(null);
  }, []);

  return (
    <div className="flex h-dvh gap-2 overflow-hidden bg-white p-2">
      <a href="#main-content" className="skip-link">Skip to content</a>

      <div
        className={`liquid-move hidden h-full shrink-0 lg:block ${
          desktopOpen ? "overflow-visible" : "overflow-hidden"
        }`}
        style={{
          width: desktopOpen ? SIDEBAR_WIDTH : 0,
        }}
      >
        <SquircleSurface
          className="h-full"
          contentClassName="squircle-black-text flex h-full min-h-0 flex-col"
          surfaceClassName="bg-white"
          seedRadius={20}
          blurValue={8}
          colorMatrixValue={20}
          alphaValue={-7}
          style={{ width: SIDEBAR_WIDTH }}
        >
          <aside aria-label="Sidebar" className="flex h-full min-h-0 flex-col">
            <AppSidebar
              user={user}
              conversations={conversations}
              onClose={() => setSidebarOpen(false)}
              onOpenModal={setAppModalView}
              closeLabel="Close sidebar"
            />
          </aside>
        </SquircleSurface>
      </div>

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
        className="fixed inset-y-0 start-0 m-0 h-dvh max-h-none w-[min(19rem,88vw)] max-w-none overflow-visible overscroll-contain border-0 bg-transparent p-2 text-primary backdrop:bg-transparent lg:hidden"
      >
        <motion.div
          className="h-full w-full"
          initial={false}
          animate={
            reduceMotion
              ? { x: 0, opacity: 1 }
              : drawerOpen
                ? { x: 0, opacity: 1, filter: "blur(0px)" }
                : { x: -24, opacity: 0, filter: "blur(4px)" }
          }
          transition={reduceMotion ? liquidReducedTransition : liquidSurfaceTransition}
        >
          <SquircleSurface
            className="h-full w-full"
            contentClassName="squircle-black-text"
            surfaceClassName="bg-white"
            seedRadius={20}
            blurValue={8}
            colorMatrixValue={20}
            alphaValue={-7}
          >
            <aside aria-label="Mobile navigation" className="h-full">
              <AppSidebar
                user={user}
                conversations={conversations}
                onClose={closeDrawer}
                closeLabel="Close navigation"
                onNavigate={closeDrawer}
                onOpenModal={setAppModalView}
              />
            </aside>
          </SquircleSurface>
        </motion.div>
      </dialog>

      <SquircleSurface
        className="min-h-0 min-w-0 flex-1"
        contentClassName="squircle-black-text flex min-h-0 flex-col"
        surfaceClassName="bg-white"
        seedRadius={20}
        blurValue={8}
        colorMatrixValue={20}
        alphaValue={-7}
      >
        <header
          className={`flex h-14 shrink-0 items-center border-b border-ui px-3 ${
            desktopOpen ? "lg:hidden" : ""
          }`}
        >
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Open sidebar"
            aria-expanded={drawerOpen || desktopOpen}
            onClick={() => {
              if (window.matchMedia("(min-width: 64rem)").matches) {
                setSidebarOpen(true);
                return;
              }
              setDrawerOpen(true);
            }}
            className="flex size-10 items-center justify-center rounded-full"
          >
            <MenuIcon className="size-5" />
          </button>
          <span className="ms-2 text-sm font-semibold">Signal</span>
        </header>
        <main id="main-content" className="m-1 min-h-0 flex-1 overflow-auto outline-none">
          {children}
        </main>
      </SquircleSurface>

      <AppModal
        view={appModalView}
        user={user}
        onClose={closeAppModal}
        onChangeView={setAppModalView}
      />
    </div>
  );
}

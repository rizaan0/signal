"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppUser, ConversationSummary } from "@/lib/app-data";
import type { AppModalView } from "@/components/app-modal";
import {
  HistoryIcon,
  InboxIcon,
  PanelLeftIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/icons";
import { ProfileMenu } from "@/components/profile-menu";

const NAVIGATION = [
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/conversations", label: "Conversations", icon: HistoryIcon },
];

export function AppSidebar({
  user,
  conversations,
  onNavigate,
  onClose,
  onOpenModal,
  closeLabel = "Close sidebar",
}: {
  user: AppUser;
  conversations: ConversationSummary[];
  onNavigate?: () => void;
  onClose?: () => void;
  onOpenModal: (view: AppModalView) => void;
  closeLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col px-3 py-3">
      <div className="mb-3 flex items-center gap-1">
        <Link
          href="/chat"
          onClick={onNavigate}
          className="flex min-h-10 min-w-0 flex-1 items-center rounded-xl px-1.5"
        >
          <span className="truncate text-sm font-semibold">Signal</span>
        </Link>
        {onClose ? (
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
          >
            <PanelLeftIcon className="size-5" />
          </button>
        ) : null}
      </div>

      <Link
        href="/chat"
        onClick={onNavigate}
        className="flex min-h-11 items-center gap-3 rounded-[1rem] bg-ink px-4 text-sm font-semibold text-ink-inverse shadow-button transition-[scale] duration-150 active:scale-[0.96]"
      >
        <PlusIcon className="size-4" strokeWidth={2} />
        New chat
      </Link>

      <nav aria-label="Primary" className="mt-4 space-y-1">
        {NAVIGATION.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`sidebar-link ${active ? "font-semibold text-primary" : "text-secondary hover:text-primary"}`}
            >
              <Icon className="size-[1.1rem]" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-3">
          <p className="text-xs font-medium text-tertiary">Recent</p>
          {conversations.length > 0 ? (
            <Link
              href="/conversations"
              onClick={onNavigate}
              className="flex min-h-10 items-center rounded-lg px-2 text-xs text-secondary hover:text-primary"
            >
              View all
            </Link>
          ) : null}
        </div>
        <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-3 py-2 text-xs leading-5 text-tertiary">
              Your conversations will appear here.
            </p>
          ) : (
            conversations.slice(0, 5).map((conversation) => {
              const href = `/chat/${conversation.id}`;
              const active = pathname === href;
              return (
                <Link
                  key={conversation.id}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={conversation.title || "Untitled conversation"}
                  className={`flex min-h-10 items-center truncate rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                    active
                      ? "font-semibold text-primary"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {conversation.title || "Untitled conversation"}
                </Link>
              );
            })
          )}
        </div>
      </div>

      <ProfileMenu user={user} onNavigate={onNavigate} onOpenModal={onOpenModal} />
    </div>
  );
}

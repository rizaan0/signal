"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppUser, ConversationSummary } from "@/lib/app-data";
import {
  HistoryIcon,
  InboxIcon,
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
}: {
  user: AppUser;
  conversations: ConversationSummary[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col px-3 py-3">
      <Link
        href="/chat"
        onClick={onNavigate}
        className="flex min-h-11 items-center gap-3 rounded-[1rem] bg-ink px-4 text-sm font-semibold text-ink-inverse shadow-button transition-[background-color,scale] duration-150 hover:bg-ink-hover active:scale-[0.96]"
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
              className={`sidebar-link ${active ? "bg-sidebar-active text-primary" : "text-secondary hover:bg-surface-hover hover:text-primary"}`}
            >
              <Icon className="size-[1.1rem]" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 min-h-0 flex-1">
        <div className="flex items-center justify-between px-3">
          <p className="text-xs font-medium text-tertiary">Recent</p>
          {conversations.length > 0 ? (
            <Link
              href="/conversations"
              onClick={onNavigate}
              className="flex min-h-10 items-center rounded-lg px-2 text-xs text-secondary hover:bg-surface-hover hover:text-primary"
            >
              View all
            </Link>
          ) : null}
        </div>
        <div className="mt-2 space-y-0.5 overflow-y-auto">
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
                      ? "bg-sidebar-active text-primary"
                      : "text-secondary hover:bg-surface-hover hover:text-primary"
                  }`}
                >
                  {conversation.title || "Untitled conversation"}
                </Link>
              );
            })
          )}
        </div>
      </div>

      <ProfileMenu user={user} onNavigate={onNavigate} />
    </div>
  );
}

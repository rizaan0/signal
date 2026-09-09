"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  ThemePreference,
  ThinkingLevel,
  UserPreferences,
} from "@/lib/app-data";

type PreferencesContextValue = {
  preferences: UserPreferences;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setThinkingLevel: (level: ThinkingLevel) => Promise<void>;
  setNotificationPreference: (
    key: "notifyAgentCompletion" | "notifyApprovalNeeded",
    enabled: boolean,
  ) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function applyTheme(theme: ThemePreference) {
  document.documentElement.classList.add("theme-changing");
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  localStorage.setItem("signal-theme", theme);
  void document.documentElement.offsetHeight;
  requestAnimationFrame(() => {
    document.documentElement.classList.remove("theme-changing");
  });
}

export function PreferencesProvider({
  initial,
  children,
}: {
  initial: UserPreferences;
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState(initial);

  useEffect(() => {
    applyTheme(preferences.theme);
  }, [preferences.theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      if (preferences.theme === "system") applyTheme("system");
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preferences.theme]);

  async function persist(patch: Record<string, unknown>) {
    const response = await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Unable to save preferences.");
    }
  }

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      async setTheme(theme) {
        const before = preferences;
        setPreferences((current) => ({ ...current, theme }));
        applyTheme(theme);
        try {
          await persist({ theme });
        } catch (error) {
          setPreferences(before);
          applyTheme(before.theme);
          throw error;
        }
      },
      async setThinkingLevel(defaultThinkingLevel) {
        const before = preferences;
        setPreferences((current) => ({ ...current, defaultThinkingLevel }));
        try {
          await persist({ defaultThinkingLevel });
        } catch (error) {
          setPreferences(before);
          throw error;
        }
      },
      async setNotificationPreference(key, enabled) {
        const before = preferences;
        setPreferences((current) => ({ ...current, [key]: enabled }));
        try {
          await persist({ [key]: enabled });
        } catch (error) {
          setPreferences(before);
          throw error;
        }
      },
    }),
    [preferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context;
}

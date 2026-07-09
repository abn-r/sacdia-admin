"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { applyPreference } from "@/lib/preferences/preference-runtime";
import {
  PREFERENCE_DEFAULTS,
  PREFERENCE_KEYS,
  PREFERENCE_REGISTRY,
  type PreferenceKey,
  type PreferenceValueMap,
  parsePreference,
} from "@/lib/preferences/preferences-config";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import type { ResolvedThemeMode } from "@/lib/preferences/theme";

const SSR_LAYOUT_PREFERENCE_KEYS = ["sidebar_variant", "sidebar_collapsible"] as const;

type PreferencesContextValue = {
  values: PreferenceValueMap;
  resolvedThemeMode: ResolvedThemeMode;
  isSynced: boolean;
  setPreference: <K extends PreferenceKey>(key: K, value: PreferenceValueMap[K]) => void;
  resetPreferences: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readDomPreference<K extends PreferenceKey>(key: K): PreferenceValueMap[K] {
  const definition = PREFERENCE_REGISTRY[key];
  const rawValue = document.documentElement.getAttribute(definition.attribute);
  return parsePreference(key, rawValue);
}

function readDomPreferences(): PreferenceValueMap {
  const values = { ...PREFERENCE_DEFAULTS };

  for (const key of PREFERENCE_KEYS) {
    (values as Record<PreferenceKey, PreferenceValueMap[PreferenceKey]>)[key] =
      readDomPreference(key);
  }

  return values;
}

export function PreferencesProvider({
  children,
  initialValues,
}: {
  children: React.ReactNode;
  initialValues: PreferenceValueMap;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [values, setValues] = useState<PreferenceValueMap>(initialValues);
  const [resolvedThemeMode, setResolvedThemeMode] = useState<ResolvedThemeMode>(
    initialValues.theme_mode === "dark" ? "dark" : "light",
  );
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const domValues = readDomPreferences();
      setValues(domValues);
      setResolvedThemeMode(
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
      setIsSynced(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const setPreference = useCallback(
    <K extends PreferenceKey>(key: K, value: PreferenceValueMap[K]) => {
      const nextResolvedThemeMode = applyPreference(key, value);

      setValues((current) => ({
        ...current,
        [key]: value,
      }));

      if (nextResolvedThemeMode) {
        setResolvedThemeMode(nextResolvedThemeMode);
        setTheme(nextResolvedThemeMode);
      }

      persistPreference(key, value);

      if (
        SSR_LAYOUT_PREFERENCE_KEYS.includes(
          key as (typeof SSR_LAYOUT_PREFERENCE_KEYS)[number],
        )
      ) {
        router.refresh();
      }
    },
    [router, setTheme],
  );

  const resetPreferences = useCallback(() => {
    let nextResolvedThemeMode: ResolvedThemeMode = "dark";

    for (const key of PREFERENCE_KEYS) {
      const value = PREFERENCE_DEFAULTS[key];
      const resolved = applyPreference(key, value);
      if (resolved) nextResolvedThemeMode = resolved;
      persistPreference(key, value);
    }

    setValues({ ...PREFERENCE_DEFAULTS });
    setResolvedThemeMode(nextResolvedThemeMode);
    setTheme(nextResolvedThemeMode);
    router.refresh();
  }, [router, setTheme]);

  const contextValue = useMemo(
    () => ({
      values,
      resolvedThemeMode,
      isSynced,
      setPreference,
      resetPreferences,
    }),
    [values, resolvedThemeMode, isSynced, setPreference, resetPreferences],
  );

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = use(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}

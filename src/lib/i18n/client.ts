"use client";

import { ADMIN_LOCALE_COOKIE, normalizeAdminLocale, type AdminLocale } from "@/lib/i18n/locale";

const PREFERENCES_STORAGE_KEY = "sacdia_admin_preferences";

function readLocaleFromCookie(): AdminLocale | null {
  if (typeof document === "undefined") {
    return null;
  }

  const allCookies = document.cookie.split(";").map((entry) => entry.trim());
  const localeCookie = allCookies.find((entry) => entry.startsWith(`${ADMIN_LOCALE_COOKIE}=`));
  if (!localeCookie) {
    return null;
  }

  const raw = localeCookie.slice(`${ADMIN_LOCALE_COOKIE}=`.length);
  try {
    return normalizeAdminLocale(decodeURIComponent(raw));
  } catch {
    return normalizeAdminLocale(raw);
  }
}

function readLocaleFromStorage(): AdminLocale | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { locale?: unknown };
    return normalizeAdminLocale(parsed.locale);
  } catch {
    return null;
  }
}

function readLocaleFromNavigator(): AdminLocale | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  const lang = (navigator.language || "").toLowerCase();
  if (lang.startsWith("en")) {
    return "en-US";
  }

  if (lang.startsWith("es-es")) {
    return "es-ES";
  }

  if (lang.startsWith("es")) {
    return "es-MX";
  }

  return null;
}

export function getClientLocale(): AdminLocale {
  return (
    readLocaleFromStorage() ??
    readLocaleFromCookie() ??
    readLocaleFromNavigator() ??
    "es-MX"
  );
}

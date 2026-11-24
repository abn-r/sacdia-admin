"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const SCOPE_COOKIE = "sacdia_admin_scope";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function readCookie(key: string): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SCOPE_COOKIE}=`))
    ?.slice(SCOPE_COOKIE.length + 1);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    const value = (parsed as Record<string, unknown> | null)?.[key];
    return typeof value === "string" && value ? value : null;
  } catch {
    return null;
  }
}

function writeCookie(key: string, value: string | null) {
  let current: Record<string, unknown> = {};
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SCOPE_COOKIE}=`))
    ?.slice(SCOPE_COOKIE.length + 1);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(raw));
      if (parsed && typeof parsed === "object") current = { ...(parsed as Record<string, unknown>) };
    } catch {
      current = {};
    }
  }
  if (value === null) delete current[key];
  else current[key] = value;
  document.cookie = `${SCOPE_COOKIE}=${encodeURIComponent(JSON.stringify(current))}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Scope (e.g. club id) remembered across pages: `?club=` wins, else the
 * `sacdia_admin_scope` cookie. Setting it writes both. Returns `null` for "all".
 */
export function useRememberedScope(key = "club"): readonly [string | null, (next: string | null) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams?.get(key) ?? null;
  const [cookieValue, setCookieValue] = useState<string | null>(null);

  // Cookie is read after mount to keep SSR and hydration output identical.
  useEffect(() => {
    setCookieValue(readCookie(key));
  }, [key]);

  const replaceParam = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next === null) params.delete(key);
      else params.set(key, next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, key],
  );

  // Cookie-remembered scope is surfaced in the URL so server pages can read it.
  useEffect(() => {
    if (urlValue === null && cookieValue !== null) replaceParam(cookieValue);
  }, [urlValue, cookieValue, replaceParam]);

  const setValue = useCallback(
    (next: string | null) => {
      writeCookie(key, next);
      setCookieValue(next);
      replaceParam(next);
    },
    [key, replaceParam],
  );

  return [urlValue ?? cookieValue, setValue] as const;
}

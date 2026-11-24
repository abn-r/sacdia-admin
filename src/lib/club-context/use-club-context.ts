"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SCOPE_COOKIE } from "@/hooks/use-remembered-scope";
import { CLUB_PARAM, SECTION_PARAM, readScopeCookieValue } from "./scope";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function rawCookie(): string | null {
  if (typeof document === "undefined") return null;
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${SCOPE_COOKIE}=`))
      ?.slice(SCOPE_COOKIE.length + 1) ?? null
  );
}

/**
 * Remembers club and section together in the `sacdia_admin_scope` cookie (the
 * same one `useRememberedScope` writes, so every module shares the choice).
 * Pass null to forget both. Keeps other keys of the cookie.
 */
export function rememberClubContext(clubId: number | null, sectionId: number | null) {
  let current: Record<string, unknown> = {};
  const raw = rawCookie();
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(raw));
      if (parsed && typeof parsed === "object") current = { ...(parsed as Record<string, unknown>) };
    } catch {
      current = {};
    }
  }
  delete current[CLUB_PARAM];
  delete current[SECTION_PARAM];
  if (clubId) current[CLUB_PARAM] = String(clubId);
  if (clubId && sectionId) current[SECTION_PARAM] = String(sectionId);
  document.cookie = `${SCOPE_COOKIE}=${encodeURIComponent(JSON.stringify(current))}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Club + section chosen for the club modules (Finanzas, Inventario, Seguros).
 * `?club=`/`?section=` win; else the remembered cookie, which is surfaced in
 * the URL (one `router.replace`) so server pages can read it. `useRememberedScope`
 * sets one key per call, which cannot move club and section atomically.
 */
export function useClubContext(): {
  clubId: number | null;
  sectionId: number | null;
  select: (clubId: number | null, sectionId: number | null) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlClub = searchParams?.get(CLUB_PARAM) ?? null;
  const urlSection = searchParams?.get(SECTION_PARAM) ?? null;
  const replace = useCallback(
    (club: string | null, section: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.delete("page");
      if (club) params.set(CLUB_PARAM, club);
      else params.delete(CLUB_PARAM);
      if (club && section) params.set(SECTION_PARAM, section);
      else params.delete(SECTION_PARAM);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Cookie-remembered choice goes to the URL when the page was opened without one.
  useEffect(() => {
    if (urlClub !== null) return;
    const raw = rawCookie();
    const club = readScopeCookieValue(raw, CLUB_PARAM);
    if (club) replace(club, readScopeCookieValue(raw, SECTION_PARAM));
  }, [urlClub, replace]);

  const select = useCallback(
    (clubId: number | null, sectionId: number | null) => {
      rememberClubContext(clubId, sectionId);
      replace(clubId ? String(clubId) : null, sectionId ? String(sectionId) : null);
    },
    [replace],
  );

  return {
    clubId: Number(urlClub) || null,
    sectionId: Number(urlSection) || null,
    select,
  };
}

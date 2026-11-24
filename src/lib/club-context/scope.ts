import { getFinanceSectionLabel } from "@/lib/finances/club-sections";
import type { ClubContextClub, ClubContextSelection } from "./types";

/** Same cookie as `useRememberedScope`; holds `{ club, section }` string ids. */
export const CLUB_CONTEXT_COOKIE = "sacdia_admin_scope";
export const CLUB_PARAM = "club";
export const SECTION_PARAM = "section";

type SearchValue = string | string[] | undefined;

function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Reads one key of the (URI-encoded JSON) scope cookie value. */
export function readScopeCookieValue(rawCookie: string | undefined | null, key: string): string | null {
  if (!rawCookie) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(rawCookie));
    const value = (parsed as Record<string, unknown> | null)?.[key];
    return typeof value === "string" && value ? value : null;
  } catch {
    return null;
  }
}

/**
 * Picks the club and section for a module: `?club=`/`?section=` win, then the
 * remembered cookie, then (club roles) the only club they have. A section is
 * auto-selected when the club has just one, and dropped when it does not
 * belong to the club.
 */
export function resolveClubContext(args: {
  clubs: ClubContextClub[];
  searchParams: { club?: SearchValue; section?: SearchValue };
  cookie?: string | null;
}): ClubContextSelection {
  const { clubs, searchParams, cookie } = args;

  const urlClub = positiveInt(first(searchParams.club));
  const cookieClub = positiveInt(readScopeCookieValue(cookie, CLUB_PARAM));
  const onlyClub = clubs.length === 1 ? (clubs[0]?.club_id ?? null) : null;

  const club =
    clubs.find((c) => c.club_id === urlClub) ??
    clubs.find((c) => c.club_id === cookieClub) ??
    clubs.find((c) => c.club_id === onlyClub) ??
    null;
  if (!club) return { club: null, section: null };

  // The cookie section only applies to the club the cookie remembers.
  const urlSection = positiveInt(first(searchParams.section));
  const cookieSection =
    club.club_id === cookieClub && urlClub === null
      ? positiveInt(readScopeCookieValue(cookie, SECTION_PARAM))
      : null;
  const wanted = urlSection ?? cookieSection;

  const section =
    club.sections.find((s) => s.club_section_id === wanted) ??
    (club.sections.length === 1 ? (club.sections[0] ?? null) : null);

  return { club, section };
}

export function sectionLabel(section: ClubContextSelection["section"]): string {
  return section ? getFinanceSectionLabel(section) : "";
}

/** Option id used by the picker: `club` or `club:section`. */
export function encodeScopeId(clubId: number, sectionId?: number | null): string {
  return sectionId ? `${clubId}:${sectionId}` : String(clubId);
}

export function decodeScopeId(id: string): { clubId: number; sectionId: number | null } | null {
  const [clubPart, sectionPart] = id.split(":");
  const clubId = positiveInt(clubPart);
  if (!clubId) return null;
  return { clubId, sectionId: positiveInt(sectionPart) };
}

export type ClubScopeOption = { id: string; name: string; hint?: string; group?: string };

/**
 * Picker options. With `allowAllSections` a club with several sections also
 * gets a "whole club" entry (`allSectionsLabel`).
 */
export function buildClubScopeOptions(
  clubs: ClubContextClub[],
  opts: { allowAllSections: boolean; allSectionsLabel: string },
): ClubScopeOption[] {
  const options: ClubScopeOption[] = [];
  for (const club of clubs) {
    if (club.sections.length === 0) {
      options.push({ id: encodeScopeId(club.club_id), name: club.name, group: club.group });
      continue;
    }
    if (opts.allowAllSections && club.sections.length > 1) {
      options.push({
        id: encodeScopeId(club.club_id),
        name: club.name,
        hint: opts.allSectionsLabel,
        group: club.group,
      });
    }
    for (const section of club.sections) {
      options.push({
        id: encodeScopeId(club.club_id, section.club_section_id),
        name: club.name,
        hint: getFinanceSectionLabel(section),
        group: club.group,
      });
    }
  }
  return options;
}

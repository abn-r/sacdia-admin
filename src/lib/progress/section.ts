import type { MemberRankingItem } from "@/lib/api/member-rankings";

/**
 * Pure helpers of «Progreso por sección». The score is shown as a plain number:
 * no colour band and no bar relative to the page.
 */

export function sectionMemberName(user: MemberRankingItem["user"]): string {
  if (!user) return "";
  const parts = [user.name ?? user.first_name, user.paternal_last_name, user.maternal_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return user.email ?? "";
}

/** Highest score first; members without a score go last, then by name. */
export function sortMembersByScore<T extends Pick<MemberRankingItem, "composite_score_pct" | "user">>(
  members: readonly T[],
): T[] {
  return [...members].sort((a, b) => {
    const sa = a.composite_score_pct;
    const sb = b.composite_score_pct;
    if (sa === null && sb !== null) return 1;
    if (sa !== null && sb === null) return -1;
    if (sa !== null && sb !== null && sa !== sb) return sb - sa;
    return sectionMemberName(a.user).localeCompare(sectionMemberName(b.user));
  });
}

export type SectionSheetErrorKind = "forbidden" | "notFound" | "error";

/** A 403 is "no access", never "not found". */
export function sectionSheetErrorKind(status: number | null): SectionSheetErrorKind {
  if (status === 403 || status === 401) return "forbidden";
  if (status === 404) return "notFound";
  return "error";
}

/**
 * "Club · Sección" when the club is known, otherwise only the section.
 * The club is omitted when it repeats the section name.
 */
export function buildSectionRankingLabel(
  sectionName: string | null | undefined,
  clubName: string | null | undefined,
  fallback: string,
): string {
  const section = sectionName?.trim() || "";
  const club = clubName?.trim() || "";
  if (!section) return club || fallback;
  if (!club || club.toLowerCase() === section.toLowerCase()) return section;
  return `${club} · ${section}`;
}

/** Query string that carries the display names to the members drill-down. */
export function buildSectionMembersHref(
  sectionId: number,
  yearId: number,
  names: { sectionName?: string | null; clubName?: string | null },
): string {
  const params = new URLSearchParams({ year_id: String(yearId) });
  if (names.sectionName) params.set("section_name", names.sectionName);
  if (names.clubName) params.set("club_name", names.clubName);
  return `/dashboard/section-rankings/${sectionId}/members?${params.toString()}`;
}

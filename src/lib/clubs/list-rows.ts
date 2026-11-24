import {
  getClubChurchName,
  getClubDistrictName,
  type ClubListItem,
} from "@/lib/clubs/fetch-list";

/** Active / total sections of a club row (`null` when the API sent none). */
export function clubSectionCounts(club: ClubListItem): { active: number; total: number } | null {
  const sections = Array.isArray(club.club_sections) ? club.club_sections : [];
  if (sections.length === 0) return null;
  return {
    active: sections.filter((section) => section.active !== false).length,
    total: sections.length,
  };
}

/**
 * Second line of the name cell: district and church, in that order, joined with
 * a middle dot. `districtLabel` formats the district ("Distrito Norte").
 */
export function clubLocationLine(
  club: ClubListItem,
  districtLabel: (name: string) => string,
): string {
  const district = getClubDistrictName(club) ?? (club.district_id ? String(club.district_id) : null);
  const church = getClubChurchName(club) ?? (club.church_id ? String(club.church_id) : null);
  return [district ? districtLabel(district) : null, church].filter(Boolean).join(" · ");
}

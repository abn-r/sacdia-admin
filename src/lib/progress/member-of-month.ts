import type { AdminMomItem } from "@/lib/api/member-of-month";

/**
 * One row per section and month. A tie lists every winner in the same row.
 */
export type MomGroup = {
  /** `${club_section_id}-${year}-${month}` */
  key: string;
  clubSectionId: number;
  clubId: number | null;
  clubName: string | null;
  sectionName: string | null;
  month: number;
  year: number;
  winners: AdminMomItem[];
  totalPoints: number;
  /** Only the exception is marked: true when at least one winner was not told. */
  unnotified: boolean;
};

export function groupMemberOfMonth(items: readonly AdminMomItem[]): MomGroup[] {
  const groups = new Map<string, MomGroup>();
  for (const item of items) {
    const key = `${item.club_section_id}-${item.year}-${item.month}`;
    const current = groups.get(key);
    if (current) {
      current.winners.push(item);
      current.totalPoints = Math.max(current.totalPoints, item.total_points);
      current.unnotified = current.unnotified || !item.notified;
      continue;
    }
    groups.set(key, {
      key,
      clubSectionId: item.club_section_id,
      clubId: item.club_id,
      clubName: item.club_name,
      sectionName: item.section_name,
      month: item.month,
      year: item.year,
      winners: [item],
      totalPoints: item.total_points,
      unnotified: !item.notified,
    });
  }
  return [...groups.values()];
}

export function memberInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** "Club · Sección", or only what is known. */
export function momSectionLabel(group: Pick<MomGroup, "clubName" | "sectionName">): string {
  const club = group.clubName?.trim() ?? "";
  const section = group.sectionName?.trim() ?? "";
  if (club && section && club.toLowerCase() !== section.toLowerCase()) return `${club} · ${section}`;
  return section || club;
}

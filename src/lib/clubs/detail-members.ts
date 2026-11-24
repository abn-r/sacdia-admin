import { normalizeClubRole, type SectionMembersGroup } from "@/lib/clubs/types";

export type ClubMemberRow = {
  key: string;
  userId: string;
  name: string;
  pictureUrl: string | null;
  sectionId: number;
  sectionName: string;
  /** Normalized non-member roles ("director", "counselor"…); empty = plain member. */
  roles: string[];
  className: string | null;
};

export type ClubMemberFilters = {
  search: string;
  /** "all" or a section id as string. */
  section: string;
  /** "all", "member" (no position) or a normalized role. */
  role: string;
  /** "all" or a class name. */
  className: string;
};

export const DEFAULT_MEMBER_FILTERS: ClubMemberFilters = {
  search: "",
  section: "all",
  role: "all",
  className: "all",
};

export function isPlainMemberRole(role: string | null | undefined): boolean {
  const normalized = normalizeClubRole(role);
  return normalized === "" || normalized === "member" || normalized === "miembro" || normalized === "user";
}

/** One row per person per section: roles and class folded together. */
export function buildMemberRows(groups: SectionMembersGroup[]): ClubMemberRow[] {
  const rows = new Map<string, ClubMemberRow>();
  for (const group of groups) {
    for (const member of group.members) {
      const key = `${group.sectionId}:${member.user_id}`;
      const existing = rows.get(key);
      const role = isPlainMemberRole(member.role) ? null : normalizeClubRole(member.role);
      if (existing) {
        if (role && !existing.roles.includes(role)) existing.roles.push(role);
        if (!existing.className && member.current_class_name) {
          existing.className = member.current_class_name;
        }
        if (!existing.pictureUrl && member.picture_url) existing.pictureUrl = member.picture_url;
        continue;
      }
      rows.set(key, {
        key,
        userId: member.user_id,
        name: member.name,
        pictureUrl: member.picture_url ?? null,
        sectionId: group.sectionId,
        sectionName: group.sectionName,
        roles: role ? [role] : [],
        className: member.current_class_name ?? null,
      });
    }
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function filterMemberRows(
  rows: ClubMemberRow[],
  filters: ClubMemberFilters,
): ClubMemberRow[] {
  const needle = fold(filters.search);
  return rows.filter((row) => {
    if (filters.section !== "all" && String(row.sectionId) !== filters.section) return false;
    if (filters.role === "member" && row.roles.length > 0) return false;
    if (filters.role !== "all" && filters.role !== "member" && !row.roles.includes(filters.role)) {
      return false;
    }
    if (filters.className !== "all" && row.className !== filters.className) return false;
    if (needle && !fold(row.name).includes(needle)) return false;
    return true;
  });
}

export function memberRoleOptions(rows: ClubMemberRow[]): string[] {
  return [...new Set(rows.flatMap((row) => row.roles))].sort();
}

export function memberClassOptions(rows: ClubMemberRow[]): string[] {
  return [
    ...new Set(rows.map((row) => row.className).filter((name): name is string => Boolean(name))),
  ].sort((a, b) => a.localeCompare(b, "es"));
}

export function paginateRows<T>(rows: T[], page: number, limit: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * limit;
  return { items: rows.slice(start, start + limit), total, totalPages, page: current };
}

export function hasActiveMemberFilters(filters: ClubMemberFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.section !== "all" ||
    filters.role !== "all" ||
    filters.className !== "all"
  );
}

/** People in a section: a person with a position and a class has several rows. */
export function uniqueMemberCount(members: readonly { user_id: string }[]): number {
  return new Set(members.map((member) => member.user_id)).size;
}

/** Numbers for the header line: people (not rows), sections and souls target of the active ones. */
export function summarizeClubFacts(groups: SectionMembersGroup[]) {
  const active = groups.filter((group) => group.active !== false);
  const people = new Set<string>();
  let souls: number | null = null;
  for (const group of active) {
    for (const member of group.members) people.add(member.user_id);
    if (group.soulsTarget != null) souls = (souls ?? 0) + group.soulsTarget;
  }
  return {
    members: people.size,
    sectionsActive: active.length,
    sectionsRegistered: groups.length,
    souls,
  };
}

/** First row per person: assignment pickers list people, not their position rows. */
export function uniqueMembers<T extends { user_id: string }>(members: readonly T[]): T[] {
  const seen = new Set<string>();
  return members.filter((member) => {
    if (seen.has(member.user_id)) return false;
    seen.add(member.user_id);
    return true;
  });
}

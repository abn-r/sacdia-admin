import type { ClubLeadership, LeadershipMember } from "@/lib/api/club-detail";
import type { ClubSectionMember } from "@/lib/api/clubs";
import {
  formatLeaderName,
  isClubRole,
  isDirectorRole,
  type ClubRoleOption,
} from "@/lib/clubs/types";

/** Positions of a section, in the order they are listed. */
export const POSITION_KEYS = [
  "director",
  "deputy-director",
  "secretary",
  "treasurer",
  "secretary-treasurer",
  "counselor",
] as const;

export type PositionKey = (typeof POSITION_KEYS)[number];

export type PositionHolder = {
  userId: string;
  name: string;
  image: string | null;
  /** Needed to revoke the position; null when the source did not carry it. */
  assignmentId: string | null;
  /** Counselors only: the class they advise, shown next to the name. */
  className?: string | null;
};

export type PositionRow = {
  key: PositionKey;
  holders: PositionHolder[];
};

export function roleMatchesPosition(role: string | null | undefined, key: PositionKey): boolean {
  return key === "director" ? isDirectorRole(role) : isClubRole(role, key);
}

/** Catalog role (id) that backs a position, if the club catalog has it. */
export function findRoleForPosition(
  roles: ClubRoleOption[],
  key: PositionKey,
): ClubRoleOption | null {
  return roles.find((role) => roleMatchesPosition(role.name, key)) ?? null;
}

function holdersFromMembers(members: ClubSectionMember[], key: PositionKey): PositionHolder[] {
  const seen = new Set<string>();
  const holders: PositionHolder[] = [];
  for (const member of members) {
    if (!roleMatchesPosition(member.role, key) || seen.has(member.user_id)) continue;
    seen.add(member.user_id);
    holders.push({
      userId: member.user_id,
      name: member.name,
      image: member.picture_url ?? null,
      assignmentId: member.assignment_id ?? null,
      className: key === "counselor" ? (member.current_class_name ?? null) : undefined,
    });
  }
  return holders;
}

function leadershipPool(leadership: ClubLeadership): LeadershipMember[] {
  return [
    leadership.director,
    ...leadership.deputies,
    ...leadership.secretaries,
    ...leadership.others,
  ].filter((member): member is LeadershipMember => member != null);
}

function holdersFromLeadership(
  leadership: ClubLeadership,
  sectionName: string,
  key: PositionKey,
): PositionHolder[] {
  const section = sectionName.trim().toLowerCase();
  const seen = new Set<string>();
  const holders: PositionHolder[] = [];
  for (const member of leadershipPool(leadership)) {
    if ((member.section_name?.trim().toLowerCase() ?? "") !== section) continue;
    if (!roleMatchesPosition(member.role_name, key) || seen.has(member.user_id)) continue;
    const name = formatLeaderName(member);
    if (!name) continue;
    seen.add(member.user_id);
    holders.push({
      userId: member.user_id,
      name,
      image: member.user_image ?? null,
      assignmentId: member.assignment_id ?? null,
    });
  }
  return holders;
}

/**
 * One row per position: who holds it. Members are the source of truth; the
 * club leadership fills in when a section's member list does not carry the role.
 */
export function buildPositionRows(
  members: ClubSectionMember[],
  leadership: ClubLeadership,
  sectionName: string,
): PositionRow[] {
  return POSITION_KEYS.map((key) => {
    const fromMembers = holdersFromMembers(members, key);
    return {
      key,
      holders:
        fromMembers.length > 0 || key === "counselor"
          ? fromMembers
          : holdersFromLeadership(leadership, sectionName, key),
    };
  });
}

export type CounselorAssignmentLike = {
  assignment_id: string;
  user_id: string;
  class_id?: number | null;
  classes?: { name?: string | null } | null;
  users?: {
    name?: string | null;
    paternal_last_name?: string | null;
    maternal_last_name?: string | null;
    user_image?: string | null;
  } | null;
};

/** Counselors with the class they advise (from the class-counselor assignments). */
export function counselorHolders(assignments: CounselorAssignmentLike[]): PositionHolder[] {
  return assignments.map((assignment) => {
    const user = assignment.users;
    const name =
      [user?.name, user?.paternal_last_name, user?.maternal_last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || assignment.user_id;
    return {
      userId: assignment.user_id,
      name,
      image: user?.user_image ?? null,
      assignmentId: assignment.assignment_id,
      className: assignment.classes?.name ?? null,
    };
  });
}

export const DESIGNATION_BLOCK_CODES = [
  "DIRECTOR_ALREADY_ACTIVE",
  "CLUB_ROLE_GUIDE_MAJOR_REQUIRED",
  "MR_CONSENT_NOT_VERIFIED",
] as const;

export type DesignationBlockCode = (typeof DESIGNATION_BLOCK_CODES)[number];

export function isKnownDesignationBlockCode(
  code: string | null | undefined,
): code is DesignationBlockCode {
  return (DESIGNATION_BLOCK_CODES as readonly string[]).includes(code ?? "");
}

/** Position the section tab opens on: first active section, else the first. */
export function pickInitialSectionId(
  sections: Array<{ sectionId: number; active?: boolean }>,
  requested: string | null | undefined,
): number | null {
  const wanted = Number(requested);
  if (requested && sections.some((section) => section.sectionId === wanted)) return wanted;
  return (sections.find((section) => section.active !== false) ?? sections[0])?.sectionId ?? null;
}

import type { ClubSectionMember } from "@/lib/api/clubs";
import type { ClubLeadership, LeadershipMember } from "@/lib/api/club-detail";

export type ClubSectionRaw = {
  club_section_id?: number;
  club_type_id?: number;
  club_type?: { name?: string; club_type_id?: number } | null;
  club_types?: { club_type_id?: number; name?: string } | null;
  name?: string | null;
  active?: boolean;
  souls_target?: number | null;
  fee?: number | null;
  meeting_day?: Array<{ day?: string }>;
  meeting_time?: Array<{ time?: string }>;
  members_count?: number;
};

export type ClubLocationRef = { name?: string | null } | null | undefined;

export type ClubFull = {
  club_id?: number;
  id?: number;
  name?: string | null;
  description?: string | null;
  active?: boolean;
  local_field_id?: number;
  district_id?: number;
  church_id?: number;
  address?: string | null;
  coordinates?: { lat?: number; lng?: number } | null;
  local_fields?: ClubLocationRef;
  districts?: ClubLocationRef;
  churches?: ClubLocationRef;
  local_field?: ClubLocationRef;
  district?: ClubLocationRef;
  church?: ClubLocationRef;
  club_sections?: ClubSectionRaw[];
  sections?: ClubSectionRaw[];
};

export type ClubTypeOption = {
  club_type_id: number;
  name: string;
};

export type ClubRoleOption = {
  role_id: string;
  name: string;
  role_category?: string;
};

export type SectionMembersGroup = {
  sectionId: number;
  sectionName: string;
  clubTypeId: number;
  clubTypeName: string;
  fee: number | null;
  soulsTarget: number | null;
  members: ClubSectionMember[];
};

export type ClubDetailTab =
  | "general"
  | "sections"
  | "roles"
  | "reports"
  | "history";

export type ClubDetailPayload = {
  club: ClubFull;
  clubId: number;
  clubTypes: ClubTypeOption[];
  sections: ClubSectionRaw[];
  sectionMemberGroups: SectionMembersGroup[];
  leadership: ClubLeadership;
  clubRoles: ClubRoleOption[];
  currentYearId: number | null;
  canManageRoles: boolean;
  canCreateSections: boolean;
};

export function clubSectionTypeName(section: {
  club_types?: { name?: string | null } | null;
  club_type?: { name?: string | null } | null;
}): string {
  return section.club_types?.name?.trim() || section.club_type?.name?.trim() || "";
}

export function clubSectionDisplayLabel(
  clubName: string | null | undefined,
  typeName: string | null | undefined,
): string {
  const club = clubName?.trim() ?? "";
  const type = typeName?.trim() ?? "";
  if (club && type) return `${club} · ${type}`;
  return club || type;
}

export function getClubSections(club: ClubFull): ClubSectionRaw[] {
  const sections = club.club_sections ?? club.sections ?? [];
  return Array.isArray(sections) ? sections : [];
}

export function resolveClubId(club: ClubFull, fallback: string | number): number {
  const id = club.club_id ?? club.id ?? Number(fallback);
  return Number.isFinite(id) ? id : Number(fallback);
}

export const SECTION_OFFICER_ROLES = [
  "director",
  "deputy-director",
  "secretary",
  "secretary-treasurer",
  "treasurer",
  "counselor",
] as const;

export type SectionOfficerRole = (typeof SECTION_OFFICER_ROLES)[number];

export type SectionOfficerPerson = {
  userId: string;
  name: string;
  image: string | null;
  role: SectionOfficerRole;
};

export type SectionOfficers = Record<SectionOfficerRole, SectionOfficerPerson[]>;

export function normalizeClubRole(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase().replace(/_/g, "-");
}

export function isClubRole(
  value: string | null | undefined,
  expected: SectionOfficerRole,
): boolean {
  return normalizeClubRole(value) === expected;
}

export function isDirectorRole(role: string | null | undefined): boolean {
  const normalized = normalizeClubRole(role);
  return normalized === "director" || normalized === "director-club";
}

export function findSectionDirectorMember(
  members: ClubSectionMember[],
): ClubSectionMember | null {
  return members.find((member) => isDirectorRole(member.role)) ?? null;
}

function leadershipPool(leadership: ClubLeadership): LeadershipMember[] {
  return [
    leadership.director,
    ...leadership.deputies,
    ...leadership.secretaries,
    ...leadership.others,
  ].filter((member): member is LeadershipMember => member != null);
}

function leadershipMatchesSection(
  member: LeadershipMember,
  sectionName: string,
): boolean {
  const normalizedSection = sectionName.trim().toLowerCase();
  return (member.section_name?.trim().toLowerCase() ?? "") === normalizedSection;
}

export function getSectionDirector(
  leadership: ClubLeadership,
  sectionName: string,
): LeadershipMember | null {
  return (
    leadershipPool(leadership).find(
      (member) =>
        isDirectorRole(member.role_name) &&
        leadershipMatchesSection(member, sectionName),
    ) ?? null
  );
}

function officerFromMember(
  member: ClubSectionMember,
  role: SectionOfficerRole,
): SectionOfficerPerson {
  return {
    userId: member.user_id,
    name: member.name,
    image: member.picture_url ?? null,
    role,
  };
}

function officerFromLeader(
  member: LeadershipMember,
  role: SectionOfficerRole,
): SectionOfficerPerson {
  return {
    userId: member.user_id,
    name: formatLeaderName(member),
    image: member.user_image ?? null,
    role,
  };
}

function uniqueOfficers(people: SectionOfficerPerson[]): SectionOfficerPerson[] {
  const seen = new Set<string>();
  return people.filter((person) => {
    if (!person.userId || !person.name || seen.has(person.userId)) return false;
    seen.add(person.userId);
    return true;
  });
}

export function getSectionOfficers(
  members: ClubSectionMember[],
  leadership: ClubLeadership,
  sectionName: string,
): SectionOfficers {
  const leaders = leadershipPool(leadership);
  const officers = {} as SectionOfficers;

  for (const role of SECTION_OFFICER_ROLES) {
    const fromMembers = members
      .filter((member) => isClubRole(member.role, role))
      .map((member) => officerFromMember(member, role));

    if (fromMembers.length > 0) {
      officers[role] = uniqueOfficers(fromMembers);
      continue;
    }

    officers[role] = uniqueOfficers(
      leaders
        .filter(
          (member) =>
            isClubRole(member.role_name, role) &&
            leadershipMatchesSection(member, sectionName),
        )
        .map((member) => officerFromLeader(member, role)),
    );
  }

  return officers;
}

export function formatLeaderName(member: LeadershipMember | null): string {
  if (!member) return "";
  return [member.name, member.paternal_last_name, member.maternal_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
}

import {
  getEnrolledClubs,
  getUnionEnrolledClubs,
  type CamporeeMember,
} from "@/lib/api/camporees";
import { listNormalizedClubSectionMembers } from "@/lib/api/clubs";

type AnyRecord = Record<string, unknown>;

export type CamporeeMemberStatusFilter =
  | "all"
  | "registered"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled";

export type CamporeeMemberInsuranceFilter =
  | "all"
  | "verified"
  | "pending"
  | "none";

export type CamporeeMemberFilters = {
  club: string;
  status: CamporeeMemberStatusFilter;
  insurance: CamporeeMemberInsuranceFilter;
};

export const DEFAULT_CAMPOREE_MEMBER_FILTERS: CamporeeMemberFilters = {
  club: "all",
  status: "all",
  insurance: "all",
};

/** Max page size for GET /camporees/:id/members (backend `@Max(100)`). */
export const LOCAL_CAMPOREE_MEMBERS_MAX_LIMIT = 100;

/** Max page size for GET /camporees/union/:id/members (backend `@Max(200)`). */
export const UNION_CAMPOREE_MEMBERS_MAX_LIMIT = 200;

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildFullName(parts: Array<string | null | undefined>): string | null {
  const name = parts.filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}

function resolveInsuranceStatus(raw: AnyRecord): string | null {
  const explicit = pickString(raw.insurance_status);
  if (explicit) return explicit;

  if (raw.insurance_verified === true) return "verified";

  const insurance = raw.insurance as AnyRecord | null | undefined;
  if (!insurance) return null;

  const endDate = pickString(insurance.end_date);
  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime()) && end.getTime() >= Date.now()) {
      return "verified";
    }
    return "expired";
  }

  return "pending";
}

export function normalizeCamporeeMember(raw: unknown): CamporeeMember {
  const record = (raw && typeof raw === "object" ? raw : {}) as AnyRecord;
  const users = (record.users ?? record.user) as AnyRecord | null | undefined;

  const userId =
    pickString(record.user_id) ??
    pickString(users?.user_id) ??
    "";

  const displayName =
    pickString(record.name) ??
    buildFullName([
      pickString(users?.name),
      pickString(users?.paternal_last_name),
      pickString(users?.maternal_last_name),
    ]) ??
    pickString(users?.email) ??
    undefined;

  const pictureUrl =
    pickString(record.picture_url) ??
    pickString(users?.user_image) ??
    null;

  const rawCamporeeMemberId = record.camporee_member_id;
  const camporeeMemberId =
    typeof rawCamporeeMemberId === "number" && Number.isFinite(rawCamporeeMemberId)
      ? rawCamporeeMemberId
      : typeof rawCamporeeMemberId === "string" && /^\d+$/.test(rawCamporeeMemberId)
        ? Number(rawCamporeeMemberId)
        : null;

  return {
    user_id: userId,
    camporee_member_id: camporeeMemberId,
    name: displayName,
    picture_url: pictureUrl,
    email: pickString(users?.email) ?? pickString(record.email),
    club_name: pickString(record.club_name),
    camporee_type:
      record.camporee_type === "local" || record.camporee_type === "union"
        ? record.camporee_type
        : undefined,
    insurance_id:
      typeof record.insurance_id === "number"
        ? record.insurance_id
        : typeof (record.insurance as AnyRecord | undefined)?.insurance_id === "number"
          ? ((record.insurance as AnyRecord).insurance_id as number)
          : null,
    insurance_status: resolveInsuranceStatus(record),
    status: pickString(record.status),
    rejection_reason: pickString(record.rejection_reason),
    class_name:
      pickString(record.class_name) ??
      pickString(record.current_class_name) ??
      pickString((record.current_class as AnyRecord | undefined)?.name),
    role_display_name:
      pickString(record.role_display_name) ??
      pickString(record.role_name) ??
      pickString(record.role),
  };
}

export function normalizeCamporeeMembers(raw: unknown): CamporeeMember[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown })?.data)
      ? (raw as { data: unknown[] }).data
      : [];

  return list.map(normalizeCamporeeMember);
}

/** Human label for a member — never uses a bare UUID as the primary name. */
export function getCamporeeMemberDisplayName(
  member: Pick<CamporeeMember, "user_id" | "name" | "email">,
  unknownLabel = "Usuario",
): string {
  const name = member.name?.trim();
  if (name && name !== member.user_id) return name;

  const email = member.email?.trim();
  if (email) return email;

  const id = member.user_id?.trim();
  if (!id) return unknownLabel;
  return `${unknownLabel} (${id.slice(0, 8)}…)`;
}

export type SelectableCamporeePaymentMember = CamporeeMember & {
  camporee_member_id: number;
};

/**
 * Members selectable for payment create — requires numeric camporee_member_id
 * because POST .../members/:memberId/payments uses ParseIntPipe on that id.
 */
export function getSelectablePaymentMembers(
  members: CamporeeMember[],
): SelectableCamporeePaymentMember[] {
  return members.filter(
    (member): member is SelectableCamporeePaymentMember =>
      typeof member.camporee_member_id === "number" &&
      Number.isFinite(member.camporee_member_id) &&
      member.camporee_member_id > 0 &&
      Boolean(member.user_id?.trim()),
  );
}

type SectionRef = {
  clubId: number;
  sectionId: number;
  clubName: string | null;
};

function extractSectionRef(raw: unknown): SectionRef | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as AnyRecord;

  const sectionId =
    typeof record.club_section_id === "number"
      ? record.club_section_id
      : typeof (record.club_sections as AnyRecord | undefined)?.club_section_id === "number"
        ? ((record.club_sections as AnyRecord).club_section_id as number)
        : null;

  const nestedClub = (record.club_sections as AnyRecord | undefined)?.clubs as
    | AnyRecord
    | undefined;

  const clubId =
    typeof record.club_id === "number"
      ? record.club_id
      : typeof nestedClub?.club_id === "number"
        ? nestedClub.club_id
        : null;

  if (!clubId || !sectionId) return null;

  const clubName =
    pickString(record.club_name) ??
    pickString(nestedClub?.name) ??
    pickString((record.club_sections as AnyRecord | undefined)?.name);

  return { clubId, sectionId, clubName };
}

async function loadEnrolledSectionRefs(
  camporeeId: number,
  isUnionCamporee: boolean,
): Promise<SectionRef[]> {
  try {
    const payload = isUnionCamporee
      ? await getUnionEnrolledClubs(camporeeId)
      : await getEnrolledClubs(camporeeId);

    const list = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown })?.data)
        ? (payload as { data: unknown[] }).data
        : [];

    const refs = list
      .map(extractSectionRef)
      .filter((ref): ref is SectionRef => ref !== null);

    const unique = new Map<string, SectionRef>();
    for (const ref of refs) {
      unique.set(`${ref.clubId}:${ref.sectionId}`, ref);
    }
    return [...unique.values()];
  } catch {
    return [];
  }
}

type MemberProfile = {
  class_name?: string | null;
  role_display_name?: string | null;
  club_name?: string | null;
};

export async function enrichCamporeeMembersWithClubProfiles(
  members: CamporeeMember[],
  camporeeId: number,
  isUnionCamporee = false,
): Promise<CamporeeMember[]> {
  if (members.length === 0) return members;

  const sectionRefs = await loadEnrolledSectionRefs(camporeeId, isUnionCamporee);
  if (sectionRefs.length === 0) return members;

  const profiles = new Map<string, MemberProfile>();

  await Promise.all(
    sectionRefs.map(async ({ clubId, sectionId, clubName }) => {
      try {
        const sectionMembers = await listNormalizedClubSectionMembers(
          clubId,
          sectionId,
        );
        for (const sectionMember of sectionMembers) {
          profiles.set(sectionMember.user_id, {
            class_name:
              sectionMember.current_class_name ??
              sectionMember.current_class?.name ??
              null,
            role_display_name:
              sectionMember.role_display_name ?? sectionMember.role ?? null,
            club_name: clubName,
          });
        }
      } catch {
        // Best effort enrichment per section.
      }
    }),
  );

  return members.map((member) => {
    const profile = profiles.get(member.user_id);
    if (!profile) return member;

    return {
      ...member,
      club_name: member.club_name ?? profile.club_name ?? null,
      class_name: member.class_name ?? profile.class_name ?? null,
      role_display_name: member.role_display_name ?? profile.role_display_name ?? null,
    };
  });
}

function normalizeInsuranceBucket(status?: string | null): CamporeeMemberInsuranceFilter {
  const normalized = status?.toLowerCase() ?? "";
  if (!normalized) return "none";
  if (
    normalized === "verified" ||
    normalized === "activo" ||
    normalized === "active"
  ) {
    return "verified";
  }
  if (normalized === "expired" || normalized === "vencido") {
    return "none";
  }
  return "pending";
}

export function filterCamporeeMembers(
  members: CamporeeMember[],
  filters: CamporeeMemberFilters,
): CamporeeMember[] {
  return members.filter((member) => {
    if (filters.club !== "all") {
      const club = member.club_name?.trim() ?? "";
      if (club !== filters.club) return false;
    }

    if (filters.insurance !== "all") {
      const bucket = normalizeInsuranceBucket(member.insurance_status);
      if (bucket !== filters.insurance) return false;
    }

    return true;
  });
}

export function collectCamporeeMemberClubOptions(members: CamporeeMember[]): string[] {
  const clubs = new Set<string>();
  for (const member of members) {
    const club = member.club_name?.trim();
    if (club) clubs.add(club);
  }
  return [...clubs].sort((a, b) => a.localeCompare(b, "es"));
}

export function statusFilterToQuery(
  status: CamporeeMemberStatusFilter,
): string | undefined {
  if (status === "all") return undefined;
  return status;
}

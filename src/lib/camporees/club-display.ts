import type { CamporeeClub } from "@/lib/api/camporees";
import { listNormalizedClubSectionMembers } from "@/lib/api/clubs";

type AnyRecord = Record<string, unknown>;

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : null;
}

function buildFullName(parts: Array<string | null | undefined>): string | null {
  const name = parts.filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}

function pickNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export function normalizeCamporeeClub(raw: unknown): CamporeeClub {
  const record = asRecord(raw) ?? {};
  const clubSections = asRecord(record.club_sections);
  const clubs = asRecord(clubSections?.clubs);
  const clubTypes = asRecord(clubSections?.club_types);
  const registrar = asRecord(record.registrar);

  const clubSectionId =
    pickNumber(record.club_section_id) ?? pickNumber(clubSections?.club_section_id) ?? 0;

  const sectionName =
    pickString(record.section_name) ??
    pickString(clubSections?.name);

  const clubName =
    pickString(record.club_name) ??
    pickString(clubs?.name);

  const sectionTypeName =
    pickString(record.section_type_name) ??
    pickString(clubTypes?.name);

  const registeredBy =
    pickString(record.registered_by) ??
    pickString(registrar?.user_id);

  const registeredByName =
    pickString(record.registered_by_name) ??
    buildFullName([
      pickString(registrar?.name),
      pickString(registrar?.paternal_last_name),
      pickString(registrar?.maternal_last_name),
    ]);

  return {
    camporee_club_id:
      pickNumber(record.camporee_club_id) ??
      pickNumber(record.id) ??
      0,
    camporee_id:
      pickNumber(record.camporee_id) ??
      pickNumber(record.union_camporee_id) ??
      0,
    club_section_id: clubSectionId,
    club_id: pickNumber(record.club_id) ?? pickNumber(clubs?.club_id),
    club_type_id:
      pickNumber(record.club_type_id) ??
      pickNumber(clubTypes?.club_type_id) ??
      pickNumber(clubSections?.club_type_id),
    section_name: sectionName,
    club_name: clubName,
    section_type_name: sectionTypeName,
    status: pickString(record.status),
    registered_by: registeredBy,
    registered_by_name: registeredByName,
    registered_by_role: pickString(record.registered_by_role),
    registered_by_picture_url:
      pickString(record.registered_by_picture_url) ??
      pickString(registrar?.user_image),
    created_at: pickString(record.created_at),
    rejection_reason: pickString(record.rejection_reason),
  };
}

export function normalizeCamporeeClubs(raw: unknown): CamporeeClub[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown })?.data)
      ? (raw as { data: unknown[] }).data
      : [];

  return list.map(normalizeCamporeeClub);
}

export type CamporeeSectionKind =
  | "adventurers"
  | "pathfinders"
  | "master_guides"
  | "unknown";

function normalizeSectionToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Classifies an enrolled camporee club section into AV / CQ / GM.
 * Prefer stable club_type_id (1/2/3), then name heuristics including AV/CQ/GM prefixes.
 */
export function detectCamporeeSectionKind(
  club: Pick<
    CamporeeClub,
    "club_type_id" | "section_type_name" | "section_name"
  >,
): CamporeeSectionKind {
  if (club.club_type_id === 1) return "adventurers";
  if (club.club_type_id === 2) return "pathfinders";
  if (club.club_type_id === 3) return "master_guides";

  const candidates = [club.section_type_name, club.section_name].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  for (const raw of candidates) {
    const slug = normalizeSectionToken(raw);
    if (
      slug.includes("aventur") ||
      slug.includes("adventur") ||
      /(^|[^a-z])avn?([^a-z]|$)/.test(slug)
    ) {
      return "adventurers";
    }
    if (
      slug.includes("conquist") ||
      slug.includes("pathfind") ||
      /(^|[^a-z])cq([^a-z]|$)/.test(slug)
    ) {
      return "pathfinders";
    }
    if (
      slug.includes("guia") ||
      slug.includes("master") ||
      slug.includes("guild") ||
      /(^|[^a-z])gm([^a-z]|$)/.test(slug)
    ) {
      return "master_guides";
    }
  }

  return "unknown";
}

/** Keep only enrolled sections that match the allowed camporee/event kinds. */
export function filterCamporeeClubsBySectionKinds(
  clubs: CamporeeClub[],
  allowedKinds: Array<"adventurers" | "pathfinders" | "master_guides">,
): CamporeeClub[] {
  if (allowedKinds.length === 0) return [];
  const allowed = new Set(allowedKinds);
  return clubs.filter((club) => {
    const kind = detectCamporeeSectionKind(club);
    return kind !== "unknown" && allowed.has(kind);
  });
}

type SectionRef = {
  clubId: number;
  sectionId: number;
};

function uniqueSectionRefs(clubs: CamporeeClub[]): SectionRef[] {
  const refs = new Map<string, SectionRef>();
  for (const club of clubs) {
    if (!club.club_id || !club.club_section_id) continue;
    refs.set(`${club.club_id}:${club.club_section_id}`, {
      clubId: club.club_id,
      sectionId: club.club_section_id,
    });
  }
  return [...refs.values()];
}

export async function enrichCamporeeClubsWithRegistrarProfiles(
  clubs: CamporeeClub[],
): Promise<CamporeeClub[]> {
  if (clubs.length === 0) return clubs;

  const sectionRefs = uniqueSectionRefs(clubs);
  if (sectionRefs.length === 0) return clubs;

  const profiles = new Map<
    string,
    { role_display_name?: string | null; picture_url?: string | null }
  >();

  await Promise.all(
    sectionRefs.map(async ({ clubId, sectionId }) => {
      try {
        const members = await listNormalizedClubSectionMembers(clubId, sectionId);
        for (const member of members) {
          profiles.set(`${sectionId}:${member.user_id}`, {
            role_display_name: member.role_display_name ?? member.role ?? null,
            picture_url: member.picture_url ?? null,
          });
        }
      } catch {
        // Best effort enrichment per section.
      }
    }),
  );

  return clubs.map((club) => {
    if (!club.registered_by || !club.club_section_id) return club;

    const profile = profiles.get(`${club.club_section_id}:${club.registered_by}`);
    if (!profile) return club;

    return {
      ...club,
      registered_by_role:
        club.registered_by_role ?? profile.role_display_name ?? null,
      registered_by_picture_url:
        club.registered_by_picture_url ?? profile.picture_url ?? null,
    };
  });
}

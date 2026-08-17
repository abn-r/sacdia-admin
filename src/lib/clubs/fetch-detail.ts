import { ApiError, apiRequest } from "@/lib/api/client";
import { getClubLeadership } from "@/lib/api/club-detail";
import {
  getCurrentEcclesiasticalYear,
  listCatalogRoles,
} from "@/lib/api/catalog-roles";
import { listAdminClubTypes } from "@/lib/api/admin-club-types";
import { listNormalizedClubSectionMembers } from "@/lib/api/clubs";
import type { ClubFull, ClubDetailPayload, SectionMembersGroup } from "@/lib/clubs/types";
import {
  getClubSections,
  resolveClubId,
} from "@/lib/clubs/types";

function unwrapClub(payload: unknown): ClubFull {
  const wrapped = payload as { data?: ClubFull } | ClubFull;
  if (
    wrapped &&
    typeof wrapped === "object" &&
    "data" in wrapped &&
    wrapped.data &&
    typeof wrapped.data === "object"
  ) {
    return wrapped.data;
  }
  return wrapped as ClubFull;
}

export async function fetchClubById(clubId: number): Promise<ClubFull | null> {
  try {
    const payload = await apiRequest<unknown>(`/clubs/${clubId}`);
    return unwrapClub(payload);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

async function loadSectionMembers(
  clubId: number,
  sections: ClubFull["club_sections"],
): Promise<SectionMembersGroup[]> {
  if (!sections?.length) return [];

  const groups = await Promise.all(
    sections.map(async (section) => {
      const sectionId = section.club_section_id;
      if (!sectionId) return null;

      const members = await listNormalizedClubSectionMembers(clubId, sectionId, {
        active: true,
      }).catch(() => []);

      const clubTypeName =
        section.club_type?.name ?? section.club_types?.name ?? "—";

      return {
        sectionId,
        sectionName: clubTypeName,
        clubTypeId: section.club_type_id ?? section.club_types?.club_type_id ?? 0,
        clubTypeName,
        fee: section.fee ?? null,
        soulsTarget: section.souls_target ?? null,
        members,
      } satisfies SectionMembersGroup;
    }),
  );

  return groups.filter((group): group is SectionMembersGroup => group != null);
}

export async function loadClubDetail(
  clubIdParam: string | number,
  options: { canManageRoles?: boolean; canCreateSections?: boolean } = {},
): Promise<ClubDetailPayload | null> {
  const club = await fetchClubById(Number(clubIdParam));
  if (!club) return null;

  const clubId = resolveClubId(club, clubIdParam);
  const sections = getClubSections(club);

  const [clubTypes, leadership, clubRoles, currentYear, sectionMemberGroups] =
    await Promise.all([
      listAdminClubTypes().catch(() => []),
      getClubLeadership(clubId).catch(() => ({
        director: null,
        deputies: [],
        secretaries: [],
        others: [],
      })),
      listCatalogRoles("CLUB").catch(() => []),
      getCurrentEcclesiasticalYear().catch(() => null),
      loadSectionMembers(clubId, sections),
    ]);

  return {
    club,
    clubId,
    clubTypes: clubTypes.map((type) => ({
      club_type_id: type.club_type_id,
      name: type.name,
    })),
    sections,
    sectionMemberGroups,
    leadership,
    clubRoles: clubRoles.map((role) => ({
      role_id: role.role_id,
      name: role.name,
      role_category: role.role_category,
    })),
    currentYearId: currentYear?.year_id ?? null,
    canManageRoles: options.canManageRoles ?? false,
    canCreateSections: options.canCreateSections ?? false,
  };
}

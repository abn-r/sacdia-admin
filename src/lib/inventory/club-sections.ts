import type { ClubType } from "@/lib/api/catalogs";
import type { InstanceType } from "@/lib/api/inventory";
import type { ClubFull, ClubSectionRaw } from "@/lib/clubs/types";
import { getClubSections } from "@/lib/clubs/types";

export type InventorySectionOption = {
  club_section_id: number;
  club_id: number;
  name: string;
  club_name: string;
  club_type_id: number;
  club_type_name: string;
  local_field_id?: number;
};

type AnyRecord = Record<string, unknown>;

function buildClubTypesByName(clubTypes: ClubType[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const clubType of clubTypes) {
    map.set(clubType.name.trim().toLowerCase(), clubType.club_type_id);
  }
  return map;
}

export function clubTypeIdToInstanceType(clubTypeId: number): InstanceType {
  if (clubTypeId === 1) return "adv";
  if (clubTypeId === 3) return "mg";
  return "pathf";
}

export function resolveSectionClubTypeId(
  section: ClubSectionRaw,
  clubTypesByName: Map<string, number>,
): number | null {
  if (typeof section.club_type_id === "number" && section.club_type_id > 0) {
    return section.club_type_id;
  }

  const nested = section.club_types ?? section.club_type;
  if (nested && typeof nested.club_type_id === "number" && nested.club_type_id > 0) {
    return nested.club_type_id;
  }

  const typeName = nested?.name?.trim().toLowerCase();
  if (typeName && clubTypesByName.has(typeName)) {
    return clubTypesByName.get(typeName) ?? null;
  }

  return null;
}

function resolveSectionClubTypeName(
  section: ClubSectionRaw,
  clubTypeId: number,
  clubTypes: ClubType[],
): string {
  const nested = section.club_types ?? section.club_type;
  if (nested?.name) return nested.name;

  return (
    clubTypes.find((clubType) => clubType.club_type_id === clubTypeId)?.name ??
    "Sección"
  );
}

function asClub(raw: unknown): ClubFull | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ClubFull;
}

export function buildInventorySectionOptions(
  clubs: unknown[],
  clubTypes: ClubType[],
): InventorySectionOption[] {
  const clubTypesByName = buildClubTypesByName(clubTypes);
  const options: InventorySectionOption[] = [];

  for (const rawClub of clubs) {
    const club = asClub(rawClub);
    if (!club) continue;

    const clubId = Number(club.club_id ?? club.id ?? 0);
    if (!Number.isFinite(clubId) || clubId <= 0) continue;

    const clubName = String(club.name ?? `Club ${clubId}`);
    const localFieldId =
      typeof club.local_field_id === "number" && club.local_field_id > 0
        ? club.local_field_id
        : undefined;

    for (const section of getClubSections(club)) {
      if (section.active === false) continue;

      const clubSectionId = Number(section.club_section_id ?? 0);
      if (!Number.isFinite(clubSectionId) || clubSectionId <= 0) continue;

      const clubTypeId = resolveSectionClubTypeId(section, clubTypesByName);
      if (!clubTypeId) continue;

      const clubTypeName = resolveSectionClubTypeName(
        section,
        clubTypeId,
        clubTypes,
      );

      options.push({
        club_section_id: clubSectionId,
        club_id: clubId,
        name: `${clubName} · ${clubTypeName}`,
        club_name: clubName,
        club_type_id: clubTypeId,
        club_type_name: clubTypeName,
        local_field_id: localFieldId,
      });
    }
  }

  return options.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function filterInventorySections(
  sections: InventorySectionOption[],
  localFieldId: number | "all",
  clubTypeId: number | "all",
): InventorySectionOption[] {
  return sections.filter((section) => {
    if (localFieldId !== "all" && section.local_field_id !== localFieldId) {
      return false;
    }
    if (clubTypeId !== "all" && section.club_type_id !== clubTypeId) {
      return false;
    }
    return true;
  });
}

export function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

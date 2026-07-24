import type { ClubType } from "@/lib/api/catalogs";

export type FinanceClubSection = {
  club_section_id: number;
  club_type_id: number;
  name: string;
  club_type?: { name?: string; slug?: string } | null;
};

type AnyRecord = Record<string, unknown>;

function buildClubTypesByName(clubTypes: ClubType[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const clubType of clubTypes) {
    map.set(clubType.name.trim().toLowerCase(), clubType.club_type_id);
  }
  return map;
}

function resolveClubTypeName(
  clubTypeId: number,
  nestedName: string | undefined,
  clubTypes: ClubType[],
): string {
  if (nestedName) return nestedName;
  return (
    clubTypes.find((clubType) => clubType.club_type_id === clubTypeId)?.name ??
    "Sección"
  );
}

export function normalizeFinanceClubSections(
  club: AnyRecord,
  clubTypes: ClubType[] = [],
): FinanceClubSection[] {
  const rawSections = club.club_sections ?? club.sections;
  if (!Array.isArray(rawSections)) return [];

  const clubTypesByName = buildClubTypesByName(clubTypes);

  const sections: FinanceClubSection[] = [];

  for (const rawSection of rawSections) {
    if (!rawSection || typeof rawSection !== "object") continue;

    const section = rawSection as AnyRecord;
    if (section.active === false) continue;

    const clubSectionId = Number(section.club_section_id ?? 0);
    if (!Number.isFinite(clubSectionId) || clubSectionId <= 0) continue;

    const nested = (section.club_types ?? section.club_type) as
      | AnyRecord
      | null
      | undefined;

    let clubTypeId = Number(section.club_type_id ?? nested?.club_type_id ?? 0);
    if ((!clubTypeId || clubTypeId <= 0) && nested?.name) {
      clubTypeId =
        clubTypesByName.get(String(nested.name).trim().toLowerCase()) ?? 0;
    }
    if (!clubTypeId || clubTypeId <= 0) continue;

    const clubTypeName = resolveClubTypeName(
      clubTypeId,
      typeof nested?.name === "string" ? nested.name : undefined,
      clubTypes,
    );

    sections.push({
      club_section_id: clubSectionId,
      club_type_id: clubTypeId,
      name:
        typeof section.name === "string" && section.name.trim()
          ? section.name.trim()
          : clubTypeName,
      club_type: clubTypeName ? { name: clubTypeName } : null,
    });
  }

  return sections.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function getFinanceSectionLabel(section: FinanceClubSection): string {
  return section.club_type?.name ?? section.name;
}

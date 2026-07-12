import type { UnitSectionOption } from "@/components/units/unit-form";

type RawClubSection = {
  club_section_id?: number;
  id?: number;
  name?: string | null;
  active?: boolean | null;
  club_type_id?: number | null;
  club_type?: { club_type_id?: number; name?: string | null } | null;
  club_types?: { club_type_id?: number; name?: string | null } | null;
};

function unwrapArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? data : [];
}

export function toUnitSectionOptions(payload: unknown): UnitSectionOption[] {
  const options: UnitSectionOption[] = [];

  for (const item of unwrapArray(payload)) {
    const section = item as RawClubSection;
    if (section.active === false) continue;

    const clubType = section.club_types ?? section.club_type ?? null;
    const id = section.club_section_id ?? section.id;
    const clubTypeId = section.club_type_id ?? clubType?.club_type_id;
    if (!id || !clubTypeId) continue;

    const clubTypeName = clubType?.name ?? null;
    options.push({
      id,
      clubTypeId,
      clubTypeName,
      name: section.name ?? clubTypeName ?? `Sección ${id}`,
    });
  }

  return options;
}

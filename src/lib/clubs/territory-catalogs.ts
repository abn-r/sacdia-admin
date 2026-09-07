import type { AuthUser } from "@/lib/auth/types";
import {
  listChurches,
  listDistricts,
  listLocalFields,
  type Church,
  type District,
  type LocalField,
} from "@/lib/api/geography";
import {
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";

export type ClubGeographyRecord = Record<string, unknown>;

function districtId(district: District & { districlub_type_id?: number }): number | null {
  const parsed = Number(district.districlub_type_id ?? district.district_id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function asRecords(items: Array<Record<string, unknown>>): ClubGeographyRecord[] {
  return items;
}

function toLocalFieldRecords(fields: LocalField[]): ClubGeographyRecord[] {
  return fields.map((field) => ({
    local_field_id: field.local_field_id,
    name: field.name,
    union_id: field.union_id,
    active: field.active !== false,
  }));
}

function toDistrictRecords(
  districts: Array<District & { districlub_type_id?: number }>,
): ClubGeographyRecord[] {
  return districts.flatMap((district) => {
    const id = districtId(district);
    if (!id) return [];
    return [
      {
        ...district,
        district_id: id,
        districlub_type_id: district.districlub_type_id ?? id,
        local_field_id: district.local_field_id,
        name: district.name,
        active: district.active !== false,
      },
    ];
  });
}

function toChurchRecords(churches: Church[]): ClubGeographyRecord[] {
  return churches.map((church) => ({
    church_id: church.church_id,
    district_id: church.district_id,
    districlub_type_id: church.district_id,
    name: church.name,
    active: church.active !== false,
  }));
}

async function listDistrictsForFields(fields: LocalField[]): Promise<ClubGeographyRecord[]> {
  const batches = await Promise.allSettled(
    fields.map((field) => listDistricts(field.local_field_id)),
  );

  return batches.flatMap((result) =>
    result.status === "fulfilled"
      ? toDistrictRecords(Array.isArray(result.value) ? result.value : [])
      : [],
  );
}

async function listChurchesForDistricts(
  districts: ClubGeographyRecord[],
): Promise<ClubGeographyRecord[]> {
  const ids = districts
    .map((district) => Number(district.districlub_type_id ?? district.district_id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const batches = await Promise.allSettled(ids.map((id) => listChurches(id)));

  return batches.flatMap((result) =>
    result.status === "fulfilled"
      ? toChurchRecords(Array.isArray(result.value) ? result.value : [])
      : [],
  );
}

/**
 * Geography pickers for club create/import. Uses public catalogs + territory
 * helpers, not `/admin/local-fields` (admin/super-admin only).
 */
export async function loadClubGeographyForTerritory(
  user: Pick<AuthUser, "authorization"> | null | undefined,
): Promise<{
  localFields: ClubGeographyRecord[];
  districts: ClubGeographyRecord[];
  churches: ClubGeographyRecord[];
}> {
  const scope = resolveAdminTerritoryScope(user);

  if (scope.level === "all") {
    const [localFields, districts, churches] = await Promise.all([
      listLocalFields().catch(() => [] as LocalField[]),
      listDistricts().catch(() => [] as District[]),
      listChurches().catch(() => [] as Church[]),
    ]);

    return {
      localFields: toLocalFieldRecords(localFields),
      districts: toDistrictRecords(districts),
      churches: toChurchRecords(churches),
    };
  }

  const localFields = await listLocalFieldsForTerritory(user).catch(() => [] as LocalField[]);
  const districts = await listDistrictsForFields(localFields);
  const churches = await listChurchesForDistricts(districts);

  return {
    localFields: asRecords(toLocalFieldRecords(localFields)),
    districts,
    churches,
  };
}

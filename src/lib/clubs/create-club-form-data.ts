import type { AuthUser } from "@/lib/auth/types";
import { canCreateClubs } from "@/lib/auth/permission-utils";
import { listClubTypes } from "@/lib/api/catalogs";
import { loadClubGeographyForTerritory } from "@/lib/clubs/territory-catalogs";
import { resolveAdminTerritoryScope } from "@/lib/auth/territory-scope";
import {
  resolveClubCreateLocalFieldDefault,
  toChurchOptions,
  toClubTypeOptions,
  toDistrictOptions,
  toLocalFieldOptions,
} from "@/lib/clubs/create-form-options";

/**
 * Props for `CreateClubForm`, shared by the full page and the intercepted
 * modal. Returns `null` when the actor cannot create clubs.
 */
export async function loadCreateClubFormData(user: AuthUser) {
  if (!canCreateClubs(user)) {
    return null;
  }

  const [{ localFields, districts, churches }, clubTypes] = await Promise.all([
    loadClubGeographyForTerritory(user),
    listClubTypes().catch(() => []),
  ]);
  const localFieldOptions = toLocalFieldOptions(localFields);
  const territory = resolveAdminTerritoryScope(user);
  const localFieldDefault = resolveClubCreateLocalFieldDefault(
    localFieldOptions,
    territory.level === "local_field" ? territory.localFieldId : null,
  );

  return {
    localFields: localFieldOptions,
    districts: toDistrictOptions(districts),
    churches: toChurchOptions(churches),
    clubTypes: toClubTypeOptions(
      clubTypes.map((item) => ({
        club_type_id: item.club_type_id,
        name: item.name,
        active: true,
      }) as Record<string, unknown>),
    ),
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    googleMapsMapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
    initialLocalFieldId: localFieldDefault.value,
    lockLocalField: localFieldDefault.locked,
  };
}

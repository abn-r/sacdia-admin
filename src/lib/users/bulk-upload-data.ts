import type { AuthUser } from "@/lib/auth/types";
import { listCountries, listLocalFields, listUnions } from "@/lib/api/geography";
import {
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import {
  extractLocalFieldRequiredRoles,
  resolveCreatableRoles,
} from "@/lib/users/assignable-roles";
import type { BulkCatalogs } from "@/lib/users/bulk-review";

export type BulkUploadData = {
  allowedRoles: string[];
  localFieldRequiredRoles: string[];
  catalogs: BulkCatalogs;
};

export type BulkUploadDataResult =
  | { ok: true; data: BulkUploadData }
  | { ok: false; error: unknown };

/**
 * What the bulk upload needs to review a file in the browser: the roles the
 * actor may assign and the places (country/union/local field) inside their
 * territory. A failed catalog load is returned, never swallowed as "empty".
 */
export async function loadBulkUploadData(currentUser: AuthUser): Promise<BulkUploadDataResult> {
  try {
    const territory = resolveAdminTerritoryScope(currentUser);
    const scoped = territory.level !== "all";
    const [countries, unions, localFields] = await Promise.all([
      listCountries(),
      scoped ? listUnionsForTerritory(currentUser) : listUnions(),
      scoped ? listLocalFieldsForTerritory(currentUser) : listLocalFields(),
    ]);

    const countryIds = new Set(unions.map((u) => u.country_id));
    return {
      ok: true,
      data: {
        allowedRoles: resolveCreatableRoles(currentUser),
        localFieldRequiredRoles: extractLocalFieldRequiredRoles(currentUser),
        catalogs: {
          countries: countries
            .filter((c) => !scoped || countryIds.size === 0 || countryIds.has(c.country_id))
            .map((c) => ({ id: c.country_id, name: c.name })),
          unions: unions.map((u) => ({
            id: u.union_id,
            name: u.name,
            countryId: typeof u.country_id === "number" && u.country_id > 0 ? u.country_id : null,
          })),
          localFields: localFields.map((l) => ({
            id: l.local_field_id,
            name: l.name,
            unionId: typeof l.union_id === "number" ? l.union_id : null,
          })),
        },
      },
    };
  } catch (error) {
    return { ok: false, error };
  }
}

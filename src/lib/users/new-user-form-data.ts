import type { AuthUser } from "@/lib/auth/types";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AdminCreatableRole } from "@/lib/api/admin-users";
import { resolveCreatableRoles } from "@/lib/users/assignable-roles";
import { listCountries } from "@/lib/api/geography";
import {
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { NewUserGeography } from "@/components/users/new-user-form";

// ─── Loader ───────────────────────────────────────────────────────────────────

export type NewUserFormData = {
  allowedRoles: AdminCreatableRole[];
  geography?: NewUserGeography;
};

/**
 * Data for the "new user" form, shared by the full page and the intercepted
 * modal. Returns `null` when the actor lacks the `users.create` capability.
 */
export async function loadNewUserFormData(
  currentUser: AuthUser,
): Promise<NewUserFormData | null> {
  // Page gate = `users.create` capability (users:create AND @GlobalRoles), as the API.
  if (!canCapability(currentUser, "users", "create")) {
    return null;
  }

  // Roles the actor may assign come from the backend
  // (`authorization.assignable_global_roles`, ROLE_HIERARCHY); the form only
  // orders them. Territory narrows the geography pickers.
  const allowedRoles = resolveCreatableRoles(currentUser);
  const territory = resolveAdminTerritoryScope(currentUser);

  let geography: NewUserGeography | undefined;
  if (territory.level !== "all") {
    const [countries, unions, localFields] = await Promise.all([
      listCountries().catch(() => []),
      listUnionsForTerritory(currentUser).catch(() => []),
      listLocalFieldsForTerritory(currentUser).catch(() => []),
    ]);

    const countryIds = new Set(
      unions
        .map((union) => union.country_id)
        .filter((id): id is number => typeof id === "number" && id > 0),
    );
    if (territory.countryId) {
      countryIds.add(territory.countryId);
    }
    const scopedCountries = countries.filter((country) =>
      countryIds.size > 0 ? countryIds.has(country.country_id) : true,
    );

    const defaultUnionId =
      territory.level === "union"
        ? territory.unionId
        : territory.level === "local_field"
          ? (territory.unionId ?? unions[0]?.union_id)
          : unions.length === 1
            ? unions[0]?.union_id
            : undefined;

    geography = {
      lockCountry: scopedCountries.length <= 1 || territory.level !== "division",
      lockUnion: territory.level === "union" || territory.level === "local_field",
      lockLocalField: territory.level === "local_field",
      countries: scopedCountries,
      unions,
      localFields,
      defaultCountryId:
        scopedCountries[0]?.country_id ?? territory.countryId ?? undefined,
      defaultUnionId,
      defaultLocalFieldId:
        territory.level === "local_field" ? territory.localFieldId : undefined,
    };
  }

  return { allowedRoles, geography };
}

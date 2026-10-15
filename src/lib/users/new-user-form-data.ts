import type { AuthUser } from "@/lib/auth/types";
import { extractRoles } from "@/lib/auth/roles";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AdminCreatableRole } from "@/lib/api/admin-users";
import { listCountries } from "@/lib/api/geography";
import {
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { NewUserGeography } from "@/components/users/new-user-form";

// ─── Role-to-allowed-creatable-roles mapping ──────────────────────────────────

/**
 * Returns the subset of AdminCreatableRole values the actor may assign.
 *
 * Hierarchy rule (Adventist club authority chain — must mirror backend
 * `ROLE_HIERARCHY` in `admin-users.service.ts`):
 *   - super-admin → all roles, including admin
 *   - admin → everything below admin (NOT admin itself; only super-admin
 *     creates admin). admin assigns director-dia.
 *   - director-dia / assistant-dia → UNION + LF + base (NOT DIA peers).
 *   - director-union / assistant-union → LF + base (NOT UNION peers).
 *   - director-lf / assistant-lf → base only (NOT LF peers). LF directors
 *     are appointed by the union, so the LF tier cannot grow itself.
 *
 * The backend enforces this server-side too; the UI filters the dropdown to
 * match so the actor never sees options that would bounce with a 403.
 */
const BASE_T5_ROLES: AdminCreatableRole[] = [
  "user",
  "coordinator",
  "zone-coordinator",
  "general-coordinator",
  "pastor",
];
const LF_ROLES: AdminCreatableRole[] = ["assistant-lf", "director-lf"];
const UNION_ROLES: AdminCreatableRole[] = [
  "assistant-union",
  "director-union",
];
const DIA_ROLES: AdminCreatableRole[] = ["assistant-dia", "director-dia"];

function resolveAllowedRoles(userRoles: string[]): AdminCreatableRole[] {
  const roleSet = new Set(userRoles);

  if (roleSet.has("super-admin")) {
    return [...BASE_T5_ROLES, ...LF_ROLES, ...UNION_ROLES, ...DIA_ROLES, "admin"];
  }
  if (roleSet.has("admin")) {
    return [...BASE_T5_ROLES, ...LF_ROLES, ...UNION_ROLES, ...DIA_ROLES];
  }
  if (roleSet.has("director-dia") || roleSet.has("assistant-dia")) {
    return [...BASE_T5_ROLES, ...LF_ROLES, ...UNION_ROLES];
  }
  if (roleSet.has("director-union") || roleSet.has("assistant-union")) {
    return [...BASE_T5_ROLES, ...LF_ROLES];
  }
  if (roleSet.has("director-lf") || roleSet.has("assistant-lf")) {
    return [...BASE_T5_ROLES];
  }
  return [];
}

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

  const userRoles = extractRoles(currentUser);
  const allowedRoles = resolveAllowedRoles(userRoles);
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

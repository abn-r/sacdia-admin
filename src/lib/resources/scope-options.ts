import type { AuthUser } from "@/lib/auth/types";
import type { ScopeLevel } from "@/lib/api/resources";
import { resolveAdminTerritoryScope } from "@/lib/auth/territory-scope";

export type ResourceScopeOptions = {
  allowedScopeLevels: ScopeLevel[];
  lockedScopeId: number | null;
};

const ALL_RESOURCE_SCOPE_LEVELS: ScopeLevel[] = [
  "system",
  "division",
  "union",
  "local_field",
];

/**
 * Resource create/edit targets follow the same role-first territory as the rest
 * of the admin. `country` on `/auth/me` is geography, not a global unlock.
 */
export function resolveResourceScopeOptions(
  user: Pick<AuthUser, "authorization"> | null | undefined,
): ResourceScopeOptions {
  const territory = resolveAdminTerritoryScope(user);

  if (territory.level === "division") {
    return { allowedScopeLevels: ["division"], lockedScopeId: territory.divisionId };
  }

  if (territory.level === "union") {
    return { allowedScopeLevels: ["union"], lockedScopeId: territory.unionId };
  }

  if (territory.level === "local_field") {
    return {
      allowedScopeLevels: ["local_field"],
      lockedScopeId: territory.localFieldId,
    };
  }

  return { allowedScopeLevels: ALL_RESOURCE_SCOPE_LEVELS, lockedScopeId: null };
}

export function isResourceScopeAllowed(
  options: ResourceScopeOptions,
  scopeLevel: ScopeLevel | null,
  scopeId: number | null,
): boolean {
  if (!scopeLevel) {
    return true;
  }

  if (!options.allowedScopeLevels.includes(scopeLevel)) {
    return false;
  }

  if (scopeLevel === "system") {
    return true;
  }

  if (options.lockedScopeId === null) {
    return true;
  }

  return scopeId === options.lockedScopeId;
}

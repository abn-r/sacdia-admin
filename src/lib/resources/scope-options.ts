import type { AuthUser } from "@/lib/auth/types";
import type { ScopeLevel } from "@/lib/api/resources";

type ScopeNode = { id?: number | string | null } | null | undefined;
type GlobalScope = {
  country?: ScopeNode;
  union?: ScopeNode;
  local_field?: ScopeNode;
};

export type ResourceScopeOptions = {
  allowedScopeLevels: ScopeLevel[];
  lockedScopeId: number | null;
};

const ALL_RESOURCE_SCOPE_LEVELS: ScopeLevel[] = ["system", "union", "local_field"];

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * Resolves the resource scopes the current admin can target.
 *
 * Empty global scope means a global/unscoped admin; that user can target every
 * resource scope. Territorial admins are narrowed to their assigned hierarchy.
 */
export function resolveResourceScopeOptions(
  user: Pick<AuthUser, "authorization"> | null | undefined,
): ResourceScopeOptions {
  const effective = (user?.authorization as Record<string, unknown> | undefined)
    ?.effective as { scope?: { global?: GlobalScope } } | undefined;
  const globalScope = effective?.scope?.global;

  if (!globalScope) {
    return { allowedScopeLevels: [], lockedScopeId: null };
  }

  const userCountryId = toPositiveNumber(globalScope.country?.id);
  const userUnionId = toPositiveNumber(globalScope.union?.id);
  const userLocalFieldId = toPositiveNumber(globalScope.local_field?.id);

  if (userCountryId || (!userUnionId && !userLocalFieldId)) {
    return { allowedScopeLevels: ALL_RESOURCE_SCOPE_LEVELS, lockedScopeId: null };
  }

  if (userUnionId) {
    return { allowedScopeLevels: ["union"], lockedScopeId: userUnionId };
  }

  if (userLocalFieldId) {
    return { allowedScopeLevels: ["local_field"], lockedScopeId: userLocalFieldId };
  }

  return { allowedScopeLevels: [], lockedScopeId: null };
}

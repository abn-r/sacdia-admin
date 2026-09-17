import type { ScopeType } from "@/lib/api/admin-users";

export type UsersScopeTypeMessageKey =
  | "filters.scopeTypes.ALL"
  | "filters.scopeTypes.DIVISION"
  | "filters.scopeTypes.UNION"
  | "filters.scopeTypes.LOCAL_FIELD";

const SCOPE_TYPE_KEYS: Record<ScopeType, UsersScopeTypeMessageKey> = {
  ALL: "filters.scopeTypes.ALL",
  DIVISION: "filters.scopeTypes.DIVISION",
  UNION: "filters.scopeTypes.UNION",
  LOCAL_FIELD: "filters.scopeTypes.LOCAL_FIELD",
};

/**
 * Maps GET /admin/users `meta.scope.type` to a next-intl key under `users`.
 * Never returns the raw enum — unknown values yield null so the UI can hide them.
 */
export function usersScopeTypeMessageKey(
  type: string | null | undefined,
): UsersScopeTypeMessageKey | null {
  if (!type) {
    return null;
  }

  const normalized = type.trim().toUpperCase();
  if (normalized in SCOPE_TYPE_KEYS) {
    return SCOPE_TYPE_KEYS[normalized as ScopeType];
  }

  return null;
}

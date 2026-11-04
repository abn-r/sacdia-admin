import { readAuthorizationTerritory } from "@/lib/auth/territory-scope";
import type { AuthUser } from "@/lib/auth/types";
import type { AdminUser } from "@/lib/api/admin-users";

type ScopeKey = "none" | "division_id" | "union_id" | "local_field_id";

export type AdminUsersScopeResult = {
  items: AdminUser[];
  applied: boolean;
  key: ScopeKey;
  label: string;
  sourceTotal: number;
  scopedTotal: number;
};

function normalizeId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function getUserField(user: AdminUser, key: Exclude<ScopeKey, "none">) {
  const record = user as unknown as Record<string, unknown>;
  if (key === "division_id") {
    return normalizeId(record.division_id ?? record.divisionId);
  }
  if (key === "union_id") {
    return normalizeId(record.union_id ?? record.unionId);
  }
  return normalizeId(record.local_field_id ?? record.localFieldId);
}

function filterByScope(items: AdminUser[], key: Exclude<ScopeKey, "none">, value: number) {
  const expected = String(value);
  return items.filter((user) => getUserField(user, key) === expected);
}

/**
 * Client-side narrowing of a users list to the actor's
 * `authorization.territory`. The API already scopes the list; this only keeps
 * rows consistent with the published anchor (`all` / `open` = no narrowing).
 */
export function applyAdminUsersScope(
  items: AdminUser[],
  currentUser: AuthUser | null | undefined,
): AdminUsersScopeResult {
  const sourceTotal = items.length;
  const territory = readAuthorizationTerritory(currentUser);

  const scoped = (key: Exclude<ScopeKey, "none">, value: number): AdminUsersScopeResult => {
    const filtered = filterByScope(items, key, value);
    return {
      items: filtered,
      applied: true,
      key,
      label: `Alcance: ${key.replace("_id", "").replace("_", " ")} ${value}`,
      sourceTotal,
      scopedTotal: filtered.length,
    };
  };

  if (territory.level === "local_field" && territory.local_field_id) {
    return scoped("local_field_id", territory.local_field_id);
  }
  if (territory.level === "union" && territory.union_id) {
    return scoped("union_id", territory.union_id);
  }
  if (territory.level === "division" && territory.division_id) {
    return scoped("division_id", territory.division_id);
  }

  return {
    items,
    applied: false,
    key: "none",
    label: territory.level === "all" ? "Acceso global" : "Alcance resuelto por el backend",
    sourceTotal,
    scopedTotal: items.length,
  };
}

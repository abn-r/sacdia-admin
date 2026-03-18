import { extractRoles } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";
import type { AdminUser } from "@/lib/api/admin-users";

type ScopeKey = "none" | "country_id" | "union_id" | "local_field_id" | "self";

export type AdminUsersScopeResult = {
  items: AdminUser[];
  applied: boolean;
  key: ScopeKey;
  label: string;
  sourceTotal: number;
  scopedTotal: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function unwrapAuthUser(user: AuthUser | null | undefined): Record<string, unknown> | null {
  if (!user) {
    return null;
  }

  const resolved = asRecord(user);
  if (!resolved) {
    return null;
  }

  if (typeof resolved.status === "string") {
    const nested = asRecord(resolved.data);
    if (nested) {
      return nested;
    }
  }

  return resolved;
}

function normalizeId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function pickId(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    if (!(key in record)) {
      continue;
    }

    const normalized = normalizeId(record[key]);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function getProfileScope(user: AuthUser | null | undefined) {
  const resolved = unwrapAuthUser(user);

  return {
    selfId: pickId(resolved, ["id", "user_id", "userId"]),
    countryId: pickId(resolved, ["country_id", "countryId"]),
    unionId: pickId(resolved, ["union_id", "unionId"]),
    localFieldId: pickId(resolved, ["local_field_id", "localFieldId"]),
  };
}

function getUserField(user: AdminUser, key: "country_id" | "union_id" | "local_field_id" | "self") {
  if (key === "self") {
    return normalizeId(user.user_id);
  }

  const record = user as unknown as Record<string, unknown>;
  if (key === "country_id") {
    return pickId(record, ["country_id", "countryId"]);
  }

  if (key === "union_id") {
    return pickId(record, ["union_id", "unionId"]);
  }

  return pickId(record, ["local_field_id", "localFieldId"]);
}

function filterByScope(items: AdminUser[], key: ScopeKey, value: string | null) {
  if (!value || key === "none") {
    return items;
  }

  return items.filter((user) => getUserField(user, key === "self" ? "self" : key) === value);
}

export function applyAdminUsersScope(
  items: AdminUser[],
  currentUser: AuthUser | null | undefined,
): AdminUsersScopeResult {
  const sourceTotal = items.length;
  const roles = new Set(extractRoles(currentUser));
  const { selfId, countryId, unionId, localFieldId } = getProfileScope(currentUser);

  if (roles.has("super_admin")) {
    return {
      items,
      applied: false,
      key: "none",
      label: "Acceso global (super_admin)",
      sourceTotal,
      scopedTotal: items.length,
    };
  }

  if (roles.has("admin")) {
    if (localFieldId) {
      const scoped = filterByScope(items, "local_field_id", localFieldId);
      return {
        items: scoped,
        applied: true,
        key: "local_field_id",
        label: `Alcance: campo local ${localFieldId}`,
        sourceTotal,
        scopedTotal: scoped.length,
      };
    }

    if (unionId) {
      const scoped = filterByScope(items, "union_id", unionId);
      return {
        items: scoped,
        applied: true,
        key: "union_id",
        label: `Alcance: union ${unionId}`,
        sourceTotal,
        scopedTotal: scoped.length,
      };
    }

    if (countryId) {
      const scoped = filterByScope(items, "country_id", countryId);
      return {
        items: scoped,
        applied: true,
        key: "country_id",
        label: `Alcance: pais ${countryId}`,
        sourceTotal,
        scopedTotal: scoped.length,
      };
    }
  }

  if (roles.has("coordinator")) {
    if (unionId) {
      const scoped = filterByScope(items, "union_id", unionId);
      return {
        items: scoped,
        applied: true,
        key: "union_id",
        label: `Alcance: union ${unionId}`,
        sourceTotal,
        scopedTotal: scoped.length,
      };
    }

    if (countryId) {
      const scoped = filterByScope(items, "country_id", countryId);
      return {
        items: scoped,
        applied: true,
        key: "country_id",
        label: `Alcance: pais ${countryId}`,
        sourceTotal,
        scopedTotal: scoped.length,
      };
    }
  }

  if (selfId) {
    const scoped = filterByScope(items, "self", selfId);
    return {
      items: scoped,
      applied: true,
      key: "self",
      label: "Alcance: solo usuario autenticado",
      sourceTotal,
      scopedTotal: scoped.length,
    };
  }

  return {
    items: [],
    applied: true,
    key: "self",
    label: "Alcance restringido por perfil (sin identificador de usuario).",
    sourceTotal,
    scopedTotal: 0,
  };
}

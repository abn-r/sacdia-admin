export type UsersRoleFilterCategory = "GLOBAL" | "CLUB";

export type UsersRoleFilterOption = {
  value: string;
  category: UsersRoleFilterCategory;
};

type CatalogRoleLike = {
  name?: string | null;
  role_name?: string | null;
  role_category?: string | null;
};

function roleNameOf(role: CatalogRoleLike): string {
  return (role.name ?? role.role_name ?? "").trim();
}

function categoryOf(role: CatalogRoleLike): UsersRoleFilterCategory {
  return role.role_category?.trim().toUpperCase() === "CLUB" ? "CLUB" : "GLOBAL";
}

/**
 * Maps GET /catalogs/roles (all active GLOBAL + CLUB rows) into unique
 * filter values. The users list API matches `role` against any of the
 * user's global or club assignments.
 */
export function toUsersRoleFilterOptions(roles: unknown): UsersRoleFilterOption[] {
  if (!Array.isArray(roles)) {
    return [];
  }

  const seen = new Set<string>();
  const options: UsersRoleFilterOption[] = [];

  for (const item of roles) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const role = item as CatalogRoleLike;
    const value = roleNameOf(role);
    if (!value) {
      continue;
    }

    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    options.push({ value, category: categoryOf(role) });
  }

  options.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category === "GLOBAL" ? -1 : 1;
    }
    return a.value.localeCompare(b.value, "es", { sensitivity: "base" });
  });

  return options;
}

export function withCurrentRoleFilterOption(
  options: UsersRoleFilterOption[],
  currentRole: string | undefined,
): UsersRoleFilterOption[] {
  const value = currentRole?.trim();
  if (!value || value === "all") {
    return options;
  }

  if (options.some((option) => option.value.toLowerCase() === value.toLowerCase())) {
    return options;
  }

  return [...options, { value, category: "GLOBAL" }];
}

/**
 * Territorial cargo for the users-list role Select.
 * Mirrors AdminUsersService.ROLE_HIERARCHY (assign-down, not own tier) plus
 * CLUB roles. Platform admins see the full catalog even if list scope is
 * UNION / LOCAL_FIELD because of a geographic anchor.
 */
export type UsersRoleFilterCargo = "ALL" | "DIVISION" | "UNION" | "LOCAL_FIELD";

const ADMIN_VIEWER_ROLES = new Set([
  "super-admin",
  "admin",
  "assistant-admin",
]);
const DIVISION_TIER_ROLES = new Set(["director-dia", "assistant-dia"]);
const UNION_TIER_ROLES = new Set(["director-union", "assistant-union"]);
const LOCAL_FIELD_TIER_ROLES = new Set(["director-lf", "assistant-lf"]);
const BASE_T5_ROLES = new Set([
  "user",
  "coordinator",
  "zone-coordinator",
  "general-coordinator",
  "pastor",
]);

type RoleFilterTier =
  | "admin"
  | "division"
  | "union"
  | "local_field"
  | "base"
  | "club";

const TIERS_BY_CARGO: Record<UsersRoleFilterCargo, ReadonlySet<RoleFilterTier>> = {
  ALL: new Set(["admin", "division", "union", "local_field", "base", "club"]),
  // División: unión downward (not DIA / admin).
  DIVISION: new Set(["union", "local_field", "base", "club"]),
  // Unión: campo local downward (LF + T5 + club; not UNION peers).
  UNION: new Set(["local_field", "base", "club"]),
  // Campo local: club roles only.
  LOCAL_FIELD: new Set(["club"]),
};

function normalizeRoleName(value: string): string {
  return value.trim().toLowerCase();
}

function roleFilterTier(option: UsersRoleFilterOption): RoleFilterTier {
  if (option.category === "CLUB") {
    return "club";
  }

  const name = normalizeRoleName(option.value);
  if (ADMIN_VIEWER_ROLES.has(name)) return "admin";
  if (DIVISION_TIER_ROLES.has(name)) return "division";
  if (UNION_TIER_ROLES.has(name)) return "union";
  if (LOCAL_FIELD_TIER_ROLES.has(name)) return "local_field";
  if (BASE_T5_ROLES.has(name)) return "base";
  return "admin";
}

export function resolveUsersRoleFilterCargo(input: {
  scopeType?: string | null;
  actorRoles?: readonly string[];
}): UsersRoleFilterCargo {
  const roles = (input.actorRoles ?? []).map(normalizeRoleName);

  if (roles.some((role) => ADMIN_VIEWER_ROLES.has(role))) {
    return "ALL";
  }

  const scope = input.scopeType?.trim().toUpperCase();
  if (
    scope === "ALL" ||
    scope === "DIVISION" ||
    scope === "UNION" ||
    scope === "LOCAL_FIELD"
  ) {
    return scope;
  }

  if (roles.some((role) => DIVISION_TIER_ROLES.has(role))) return "DIVISION";
  if (roles.some((role) => UNION_TIER_ROLES.has(role))) return "UNION";
  if (roles.some((role) => LOCAL_FIELD_TIER_ROLES.has(role))) {
    return "LOCAL_FIELD";
  }

  return "ALL";
}

export function filterUsersRoleOptionsByViewer(
  options: UsersRoleFilterOption[],
  input: { scopeType?: string | null; actorRoles?: readonly string[] },
): UsersRoleFilterOption[] {
  const allowed = TIERS_BY_CARGO[resolveUsersRoleFilterCargo(input)];
  return options.filter((option) => allowed.has(roleFilterTier(option)));
}

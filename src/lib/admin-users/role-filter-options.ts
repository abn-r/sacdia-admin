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
 * Which GLOBAL roles the users-list role Select offers.
 *
 * The backend publishes the roles the actor may assign
 * (`authorization.assignable_global_roles`, assign-down hierarchy) and the
 * actor's territory. An unrestricted territory (`all` / `open`, e.g. platform
 * admins) sees the whole catalog even when the list scope is UNION /
 * LOCAL_FIELD because of a geographic anchor; everyone else filters GLOBAL
 * options down to the assignable set. CLUB roles are always offered.
 */
export type UsersRoleFilterViewer = {
  scopeType?: string | null;
  assignableGlobalRoles?: readonly string[];
  territoryLevel?: string | null;
};

function normalizeRoleName(value: string): string {
  return value.trim().toLowerCase();
}

function viewerSeesWholeCatalog(viewer: UsersRoleFilterViewer): boolean {
  const level = viewer.territoryLevel?.trim().toLowerCase();
  return level === "all" || level === "open";
}

export function filterUsersRoleOptionsByViewer(
  options: UsersRoleFilterOption[],
  viewer: UsersRoleFilterViewer,
): UsersRoleFilterOption[] {
  if (viewerSeesWholeCatalog(viewer)) {
    return options;
  }

  const assignable = new Set((viewer.assignableGlobalRoles ?? []).map(normalizeRoleName));
  return options.filter(
    (option) =>
      option.category === "CLUB" || assignable.has(normalizeRoleName(option.value)),
  );
}

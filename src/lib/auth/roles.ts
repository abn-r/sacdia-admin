import type { AuthUser } from "@/lib/auth/types";

export const ALLOWED_ADMIN_ROLES = [
  "super-admin",
  "admin",
  "coordinator",
  "zone-coordinator",
  "general-coordinator",
  "pastor",
  "assistant-lf",
  "director-lf",
  "assistant-union",
  "director-union",
  "assistant-dia",
  "director-dia",
] as const;
const RBAC_LEGACY_FALLBACK_ENABLED =
  process.env.NEXT_PUBLIC_RBAC_LEGACY_FALLBACK === "true";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRole(role: unknown): string | null {
  if (typeof role !== "string") {
    return null;
  }

  return role.trim().toLowerCase();
}

function unwrapResponse(user: AuthUser): AuthUser {
  const status = user["status"];
  const data = user["data"];

  if (
    typeof status === "string" &&
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    return data as AuthUser;
  }

  return user;
}

function addRole(set: Set<string>, value: unknown) {
  const normalized = normalizeRole(value);
  if (normalized) {
    set.add(normalized);
  }
}

function extractCanonicalRoles(resolved: AuthUser): string[] {
  const roles = new Set<string>();

  // 1. Flat roles array (from login response: data.user.roles = ['super-admin', ...])
  if (Array.isArray(resolved.roles)) {
    resolved.roles.forEach((role) => addRole(roles, role));
  }

  // 2. Canonical authorization structure (from /auth/me: authorization.grants.global_roles[])
  const authorization = resolved.authorization;

  if (isRecord(authorization)) {
    const grants = authorization.grants;
    if (isRecord(grants)) {
      const addRolesFromGrantList = (grantList: unknown) => {
        if (!Array.isArray(grantList)) {
          return;
        }

        for (const grant of grantList) {
          if (!isRecord(grant)) {
            continue;
          }

          addRole(roles, grant.role_name);
          addRole(roles, grant.role);
          addRole(roles, grant.name);
          addRole(roles, grant.key);
        }
      };

      addRolesFromGrantList(grants.global_roles);
      addRolesFromGrantList(grants.club_assignments);
    }
  }

  return Array.from(roles);
}

function extractLegacyRoles(resolved: AuthUser): string[] {
  const roles = new Set<string>();

  addRole(roles, resolved.role);

  if (Array.isArray(resolved.roles)) {
    resolved.roles.forEach((role) => addRole(roles, role));
  }

  const nestedKeys = ["global_role", "global_roles", "club_roles"];
  nestedKeys.forEach((key) => {
    const value = resolved[key];

    if (Array.isArray(value)) {
      value.forEach((role) => addRole(roles, role));
      return;
    }

    addRole(roles, value);
  });

  const usersRoles = resolved["users_roles"];
  if (Array.isArray(usersRoles)) {
    for (const ur of usersRoles) {
      if (!isRecord(ur)) {
        continue;
      }

      const nestedRole = ur["roles"];
      if (isRecord(nestedRole)) {
        addRole(roles, nestedRole["role_name"]);
      }
    }
  }

  const metadata = resolved["metadata"];
  if (isRecord(metadata)) {
    addRole(roles, metadata["role"]);

    const rolesList = metadata["roles"];
    if (Array.isArray(rolesList)) {
      rolesList.forEach((role) => addRole(roles, role));
    }
  }

  return Array.from(roles);
}

export function extractRoles(user: AuthUser | null | undefined): string[] {
  if (!user) {
    return [];
  }

  const resolved = unwrapResponse(user);
  const canonicalRoles = extractCanonicalRoles(resolved);
  if (canonicalRoles.length > 0) {
    return canonicalRoles;
  }

  if (!RBAC_LEGACY_FALLBACK_ENABLED) {
    return [];
  }

  return extractLegacyRoles(resolved);
}

export function hasAdminRole(user: AuthUser | null | undefined): boolean {
  const roleSet = new Set(extractRoles(user));
  return ALLOWED_ADMIN_ROLES.some((role) => roleSet.has(role));
}

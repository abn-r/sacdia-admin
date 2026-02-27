import {
  CLUBS_CREATE,
  CLUBS_INSTANCES_CREATE,
  CLUBS_INSTANCES_READ,
  CLUBS_INSTANCES_UPDATE,
  CLUBS_READ,
  CLUBS_UPDATE,
  CLUB_INSTANCES_CREATE,
  CLUB_INSTANCES_READ,
  CLUB_INSTANCES_UPDATE,
} from "@/lib/auth/permissions";
import { ALLOWED_ADMIN_ROLES, extractRoles } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";

type UnknownRecord = Record<string, unknown>;

export const CLUBS_READ_KEYS = [CLUBS_READ];
export const CLUBS_CREATE_KEYS = [CLUBS_CREATE];
export const CLUBS_UPDATE_KEYS = [CLUBS_UPDATE];

export const CLUBS_INSTANCES_READ_KEYS = [CLUBS_INSTANCES_READ, CLUB_INSTANCES_READ];
export const CLUBS_INSTANCES_CREATE_KEYS = [CLUBS_INSTANCES_CREATE, CLUB_INSTANCES_CREATE];
export const CLUBS_INSTANCES_UPDATE_KEYS = [CLUBS_INSTANCES_UPDATE, CLUB_INSTANCES_UPDATE];

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePermission(value: string) {
  return value.trim().toLowerCase();
}

function addPermission(set: Set<string>, value: unknown) {
  if (typeof value === "string") {
    const normalized = normalizePermission(value);
    if (normalized) {
      set.add(normalized);
    }
  }
}

function addPermissionFromUnknown(set: Set<string>, value: unknown) {
  if (typeof value === "string") {
    // Accept comma/space separated permissions, and single values.
    const parts = value.split(/[,\s]+/g).filter(Boolean);
    if (parts.length === 0) {
      addPermission(set, value);
      return;
    }
    parts.forEach((part) => addPermission(set, part));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => addPermissionFromUnknown(set, item));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const candidates = [
    value.permission_key,
    value.permission_name,
    value.key,
    value.name,
    value.code,
    value.permission,
  ];
  candidates.forEach((candidate) => addPermission(set, candidate));

  if (value.permissions) {
    addPermissionFromUnknown(set, value.permissions);
  }
}

function collectFromRoleRecord(set: Set<string>, roleRecord: UnknownRecord) {
  addPermissionFromUnknown(set, roleRecord.permissions);
  addPermissionFromUnknown(set, roleRecord.role_permissions);
}

function unwrapUserPayload(user: AuthUser | null | undefined): UnknownRecord | null {
  if (!user || !isRecord(user)) {
    return null;
  }

  const status = user.status;
  const nestedData = user.data;
  if (
    typeof status === "string" &&
    isRecord(nestedData)
  ) {
    return nestedData;
  }

  return user;
}

export function extractPermissions(user: AuthUser | null | undefined): string[] {
  const root = unwrapUserPayload(user);
  if (!root) {
    return [];
  }

  const permissionSet = new Set<string>();

  addPermissionFromUnknown(permissionSet, root.permissions);

  if (Array.isArray(root.role_permissions)) {
    root.role_permissions.forEach((rolePermission) => addPermissionFromUnknown(permissionSet, rolePermission));
  }

  if (Array.isArray(root.users_roles)) {
    for (const usersRole of root.users_roles) {
      if (!isRecord(usersRole)) {
        continue;
      }

      addPermissionFromUnknown(permissionSet, usersRole.permissions);
      addPermissionFromUnknown(permissionSet, usersRole.role_permissions);

      if (isRecord(usersRole.roles)) {
        collectFromRoleRecord(permissionSet, usersRole.roles);
      }
    }
  }

  if (Array.isArray(root.roles)) {
    for (const role of root.roles) {
      if (isRecord(role)) {
        collectFromRoleRecord(permissionSet, role);
      }
    }
  }

  return Array.from(permissionSet);
}

export function hasPermission(
  user: AuthUser | null | undefined,
  permissionKey: string,
) {
  const permissions = new Set(extractPermissions(user));
  return permissions.has(normalizePermission(permissionKey));
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissionKeys: string[],
) {
  const permissions = new Set(extractPermissions(user));
  return permissionKeys.some((permissionKey) => permissions.has(normalizePermission(permissionKey)));
}

export function hasAnyRole(
  user: AuthUser | null | undefined,
  roleCandidates: readonly string[],
) {
  const roleSet = new Set(extractRoles(user));
  return roleCandidates.some((role) => roleSet.has(role));
}

export function hasClubRole(user: AuthUser | null | undefined) {
  return extractRoles(user).some((role) => role.includes("club"));
}

type PermissionGateOptions = {
  allowAdminFallback?: boolean;
  allowClubRoleFallback?: boolean;
};

export function canByPermissionOrRole(
  user: AuthUser | null | undefined,
  permissionKeys: string[],
  options: PermissionGateOptions = {},
) {
  const { allowAdminFallback = false, allowClubRoleFallback = false } = options;

  if (hasAnyPermission(user, permissionKeys)) {
    return true;
  }

  if (allowAdminFallback && hasAnyRole(user, ALLOWED_ADMIN_ROLES)) {
    return true;
  }

  if (allowClubRoleFallback && hasClubRole(user)) {
    return true;
  }

  return false;
}

export function canReadClubs(user: AuthUser | null | undefined) {
  return canByPermissionOrRole(user, CLUBS_READ_KEYS, {
    allowAdminFallback: true,
    allowClubRoleFallback: true,
  });
}

export function canCreateClubs(user: AuthUser | null | undefined) {
  return canByPermissionOrRole(user, CLUBS_CREATE_KEYS, {
    allowAdminFallback: true,
    allowClubRoleFallback: true,
  });
}

export function canUpdateClubs(user: AuthUser | null | undefined) {
  return canByPermissionOrRole(user, CLUBS_UPDATE_KEYS, {
    allowAdminFallback: true,
    allowClubRoleFallback: true,
  });
}

export function canReadClubInstances(user: AuthUser | null | undefined) {
  return canByPermissionOrRole(user, CLUBS_INSTANCES_READ_KEYS, {
    allowAdminFallback: true,
    allowClubRoleFallback: true,
  });
}

export function canCreateClubInstances(user: AuthUser | null | undefined) {
  return canByPermissionOrRole(user, CLUBS_INSTANCES_CREATE_KEYS, {
    allowAdminFallback: true,
    allowClubRoleFallback: true,
  });
}

export function canUpdateClubInstances(user: AuthUser | null | undefined) {
  return canByPermissionOrRole(user, CLUBS_INSTANCES_UPDATE_KEYS, {
    allowAdminFallback: true,
    allowClubRoleFallback: true,
  });
}

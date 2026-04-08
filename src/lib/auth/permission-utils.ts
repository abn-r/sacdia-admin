import {
  CLUBS_CREATE,
  CLUB_SECTIONS_CREATE,
  CLUB_SECTIONS_READ,
  CLUB_SECTIONS_UPDATE,
  CLUBS_READ,
  CLUBS_UPDATE,
  EMERGENCY_CONTACTS_READ,
  EMERGENCY_CONTACTS_UPDATE,
  HEALTH_READ,
  HEALTH_UPDATE,
  LEGAL_REPRESENTATIVE_READ,
  LEGAL_REPRESENTATIVE_UPDATE,
  POST_REGISTRATION_READ,
  POST_REGISTRATION_UPDATE,
  REGISTRATION_COMPLETE,
  USERS_READ_DETAIL,
  USERS_UPDATE,
} from "@/lib/auth/permissions";
import { ALLOWED_ADMIN_ROLES, extractRoles } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";

type UnknownRecord = Record<string, unknown>;

type RbacTelemetryEvent = "rbac_canonical_used" | "rbac_legacy_fallback_used";

const emittedEvents = new Set<string>();
export const RBAC_LEGACY_FALLBACK_ENABLED =
  process.env.NEXT_PUBLIC_RBAC_LEGACY_FALLBACK === "true";

export const CLUBS_READ_KEYS = [CLUBS_READ];
export const CLUBS_CREATE_KEYS = [CLUBS_CREATE];
export const CLUBS_UPDATE_KEYS = [CLUBS_UPDATE];

export const CLUB_SECTIONS_READ_KEYS = [CLUB_SECTIONS_READ];
export const CLUB_SECTIONS_CREATE_KEYS = [CLUB_SECTIONS_CREATE];
export const CLUB_SECTIONS_UPDATE_KEYS = [CLUB_SECTIONS_UPDATE];

export type SensitiveUserFamily =
  | "health"
  | "emergency_contacts"
  | "legal_representative"
  | "post_registration";

const SENSITIVE_USER_READ_KEYS: Record<SensitiveUserFamily, string[]> = {
  health: [HEALTH_READ, USERS_READ_DETAIL],
  emergency_contacts: [EMERGENCY_CONTACTS_READ, USERS_READ_DETAIL],
  legal_representative: [LEGAL_REPRESENTATIVE_READ, USERS_READ_DETAIL],
  post_registration: [POST_REGISTRATION_READ, USERS_READ_DETAIL],
};

const SENSITIVE_USER_UPDATE_KEYS: Record<SensitiveUserFamily, string[]> = {
  health: [HEALTH_UPDATE, USERS_UPDATE],
  emergency_contacts: [EMERGENCY_CONTACTS_UPDATE, USERS_UPDATE],
  legal_representative: [LEGAL_REPRESENTATIVE_UPDATE, USERS_UPDATE],
  post_registration: [POST_REGISTRATION_UPDATE, USERS_UPDATE],
};

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

function unwrapUserPayload(
  user: AuthUser | null | undefined,
): UnknownRecord | null {
  if (!user || !isRecord(user)) {
    return null;
  }

  const status = user.status;
  const nestedData = user.data;
  if (typeof status === "string" && isRecord(nestedData)) {
    return nestedData;
  }

  return user;
}

function emitRbacEvent(
  event: RbacTelemetryEvent,
  payload: Record<string, unknown>,
) {
  const key = `${event}:${JSON.stringify(payload)}`;
  if (emittedEvents.has(key)) {
    return;
  }
  emittedEvents.add(key);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(event, { detail: payload }));
  }

  // Simple telemetry sink until analytics provider is wired.
  console.info(`[rbac] ${event}`, payload);
}

function extractCanonicalPermissions(root: UnknownRecord): string[] {
  const permissionSet = new Set<string>();

  const authorization = isRecord(root.authorization)
    ? root.authorization
    : null;
  if (!authorization) {
    return [];
  }

  const effective = isRecord(authorization.effective)
    ? authorization.effective
    : null;
  if (effective) {
    addPermissionFromUnknown(permissionSet, effective.permissions);
  }

  return Array.from(permissionSet);
}

function extractLegacyPermissions(root: UnknownRecord): string[] {
  const permissionSet = new Set<string>();

  addPermissionFromUnknown(permissionSet, root.permissions);

  if (Array.isArray(root.role_permissions)) {
    root.role_permissions.forEach((rolePermission) =>
      addPermissionFromUnknown(permissionSet, rolePermission),
    );
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

export function extractPermissions(
  user: AuthUser | null | undefined,
): string[] {
  const root = unwrapUserPayload(user);
  if (!root) {
    return [];
  }

  const canonicalPermissions = extractCanonicalPermissions(root);
  if (canonicalPermissions.length > 0) {
    emitRbacEvent("rbac_canonical_used", { source: "authorization" });
    return canonicalPermissions;
  }

  if (!RBAC_LEGACY_FALLBACK_ENABLED) {
    return [];
  }

  const legacyPermissions = extractLegacyPermissions(root);
  if (legacyPermissions.length > 0) {
    emitRbacEvent("rbac_legacy_fallback_used", { source: "legacy" });
  }

  return legacyPermissions;
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
  return permissionKeys.some((permissionKey) =>
    permissions.has(normalizePermission(permissionKey)),
  );
}

export function canReadSensitiveUserData(user: AuthUser | null | undefined) {
  return ["health", "emergency_contacts", "legal_representative"]
    .some((family) =>
      canReadSensitiveUserFamily(user, family as SensitiveUserFamily),
    );
}

export function canReadSensitiveUserFamily(
  user: AuthUser | null | undefined,
  family: SensitiveUserFamily,
) {
  return hasAnyPermission(user, SENSITIVE_USER_READ_KEYS[family]);
}

export function canUpdateSensitiveUserFamily(
  user: AuthUser | null | undefined,
  family: SensitiveUserFamily,
) {
  return hasAnyPermission(user, SENSITIVE_USER_UPDATE_KEYS[family]);
}

export function canViewAdministrativeCompletion(
  user: AuthUser | null | undefined,
) {
  return hasAnyPermission(user, [
    ...SENSITIVE_USER_READ_KEYS.post_registration,
    ...SENSITIVE_USER_UPDATE_KEYS.post_registration,
  ]);
}

export function canCompleteRegistrationForOthers(
  user: AuthUser | null | undefined,
) {
  return hasPermission(user, REGISTRATION_COMPLETE);
}

export function canManageAdministrativeCompletion(
  user: AuthUser | null | undefined,
) {
  return canCompleteRegistrationForOthers(user);
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

  if (
    allowAdminFallback &&
    RBAC_LEGACY_FALLBACK_ENABLED &&
    hasAnyRole(user, ALLOWED_ADMIN_ROLES)
  ) {
    emitRbacEvent("rbac_legacy_fallback_used", { source: "legacy_admin_role" });
    return true;
  }

  if (
    allowClubRoleFallback &&
    RBAC_LEGACY_FALLBACK_ENABLED &&
    hasClubRole(user)
  ) {
    emitRbacEvent("rbac_legacy_fallback_used", { source: "legacy_club_role" });
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

export function canReadClubSections(user: AuthUser | null | undefined) {
  return canByPermissionOrRole(user, CLUB_SECTIONS_READ_KEYS, {
    allowAdminFallback: true,
    allowClubRoleFallback: true,
  });
}

export function canCreateClubSections(user: AuthUser | null | undefined) {
  return canByPermissionOrRole(user, CLUB_SECTIONS_CREATE_KEYS, {
    allowAdminFallback: true,
    allowClubRoleFallback: true,
  });
}

export function canUpdateClubSections(user: AuthUser | null | undefined) {
  return canByPermissionOrRole(user, CLUB_SECTIONS_UPDATE_KEYS, {
    allowAdminFallback: true,
    allowClubRoleFallback: true,
  });
}

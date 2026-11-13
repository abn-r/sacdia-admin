import type { CapabilityKey } from "@/lib/auth/generated/capability-keys";
import {
  EMERGENCY_CONTACTS_READ,
  EMERGENCY_CONTACTS_UPDATE,
  HEALTH_READ,
  HEALTH_UPDATE,
  GUARDIANSHIP_READ,
  GUARDIANSHIP_UPDATE,
  POST_REGISTRATION_READ,
  REGISTRATION_COMPLETE,
  USERS_READ_DETAIL,
  USERS_UPDATE_PROFILE,
} from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/types";

type UnknownRecord = Record<string, unknown>;

export type SensitiveUserFamily =
  | "health"
  | "emergency_contacts"
  | "guardianship"
  | "post_registration";

const SENSITIVE_USER_READ_KEYS: Record<SensitiveUserFamily, string[]> = {
  health: [HEALTH_READ, USERS_READ_DETAIL],
  emergency_contacts: [EMERGENCY_CONTACTS_READ, USERS_READ_DETAIL],
  guardianship: [GUARDIANSHIP_READ, USERS_READ_DETAIL],
  post_registration: [POST_REGISTRATION_READ, USERS_READ_DETAIL],
};

const SENSITIVE_USER_UPDATE_KEYS: Record<SensitiveUserFamily, string[]> = {
  health: [HEALTH_UPDATE, USERS_UPDATE_PROFILE],
  emergency_contacts: [EMERGENCY_CONTACTS_UPDATE, USERS_UPDATE_PROFILE],
  guardianship: [GUARDIANSHIP_UPDATE, USERS_UPDATE_PROFILE],
  post_registration: [REGISTRATION_COMPLETE, USERS_UPDATE_PROFILE],
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function addKey(set: Set<string>, value: unknown) {
  if (typeof value === "string") {
    const normalized = normalizeKey(value);
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
      addKey(set, value);
      return;
    }
    parts.forEach((part) => addKey(set, part));
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
  candidates.forEach((candidate) => addKey(set, candidate));

  if (value.permissions) {
    addPermissionFromUnknown(set, value.permissions);
  }
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

function readAuthorization(user: AuthUser | null | undefined): UnknownRecord | null {
  const root = unwrapUserPayload(user);
  if (!root) {
    return null;
  }
  return isRecord(root.authorization) ? root.authorization : null;
}

/**
 * Effective permissions resolved by the backend
 * (`authorization.effective.permissions`). No legacy fallback: a payload
 * without the canonical block grants nothing.
 */
export function extractPermissions(
  user: AuthUser | null | undefined,
): string[] {
  const authorization = readAuthorization(user);
  if (!authorization) {
    return [];
  }

  const permissionSet = new Set<string>();
  const effective = isRecord(authorization.effective) ? authorization.effective : null;
  if (effective) {
    addPermissionFromUnknown(permissionSet, effective.permissions);
  }

  return Array.from(permissionSet);
}

/**
 * `authorization.capabilities` of `/auth/me`: the verbs the actor may attempt
 * on at least one target. Absent (backend not yet publishing them) → empty
 * set, i.e. every capability gate denies.
 */
export function extractCapabilities(
  user: AuthUser | null | undefined,
): Set<string> {
  const authorization = readAuthorization(user);
  const capabilities = new Set<string>();
  if (!authorization || !Array.isArray(authorization.capabilities)) {
    return capabilities;
  }

  for (const capability of authorization.capabilities) {
    addKey(capabilities, capability);
  }

  return capabilities;
}

export function hasCapability(
  user: AuthUser | null | undefined,
  capability: CapabilityKey,
): boolean {
  return extractCapabilities(user).has(capability);
}

/** Some global role other than `user`: the actor may open the admin panel. */
export function canAccessAdminPanel(user: AuthUser | null | undefined): boolean {
  return hasCapability(user, "admin_panel.access");
}

/**
 * The actor's global roles are exactly `{pastor}`: they see only the
 * authorization screen (decision 2026-10-08).
 */
export function isPastorOnlyUser(user: AuthUser | null | undefined): boolean {
  return hasCapability(user, "admin_panel.pastor_only");
}

export function hasPermission(
  user: AuthUser | null | undefined,
  permissionKey: string,
) {
  const permissions = new Set(extractPermissions(user));
  return permissions.has(normalizeKey(permissionKey));
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissionKeys: string[],
) {
  const permissions = new Set(extractPermissions(user));
  return permissionKeys.some((permissionKey) =>
    permissions.has(normalizeKey(permissionKey)),
  );
}

export function canReadSensitiveUserData(user: AuthUser | null | undefined) {
  return ["health", "emergency_contacts", "guardianship"]
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

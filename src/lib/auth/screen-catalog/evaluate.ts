import { extractPermissions } from "@/lib/auth/permission-utils";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";

import { roleGateSatisfied } from "./role-aliases";
import type { AccessSubject, CapabilityGate } from "./types";

function normalizePermission(permission: string): string {
  return permission.trim().toLowerCase();
}

/** Builds the evaluator subject from a session user (server or client). */
export function subjectFromUser(user: AuthUser | null | undefined): AccessSubject {
  const roles = new Set(extractRoles(user));
  return {
    roles,
    permissions: new Set(extractPermissions(user).map(normalizePermission)),
    isSuperAdmin: roles.has(SUPER_ADMIN_ROLE),
  };
}

/**
 * Single evaluator for `viewAny` and capability gates.
 * Permissions: any-of by default, all-of with `requireAll`.
 * Roles: any-of after alias expansion (same as the backend guard), or literal
 * match when `exactRoles` is set (service-level rules).
 * Empty gate = allowed. Super-admin bypasses everything.
 */
export function evaluateAccess(
  subject: AccessSubject,
  access: CapabilityGate,
): boolean {
  if (subject.isSuperAdmin) {
    return true;
  }

  const permissions = access.permissions ?? [];
  const roles = access.roles ?? [];

  if (permissions.length === 0 && roles.length === 0) {
    return true;
  }

  const permissionsOk =
    permissions.length === 0 ||
    (access.requireAll
      ? permissions.every((permission) =>
          subject.permissions.has(normalizePermission(permission)),
        )
      : permissions.some((permission) =>
          subject.permissions.has(normalizePermission(permission)),
        ));

  if (!permissionsOk) {
    return false;
  }

  if (access.exactRoles) {
    return roles.length === 0 || roles.some((role) => subject.roles.has(role));
  }
  return roleGateSatisfied(subject.roles, roles);
}

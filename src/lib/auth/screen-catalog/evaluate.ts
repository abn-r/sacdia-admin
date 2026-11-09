import { extractCapabilities, extractPermissions } from "@/lib/auth/permission-utils";
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
    capabilities: extractCapabilities(user),
    isSuperAdmin: roles.has(SUPER_ADMIN_ROLE),
  };
}

/** True when the subject carries every (or any) permission of the gate. */
function permissionsSatisfied(subject: AccessSubject, access: CapabilityGate): boolean {
  const permissions = access.permissions ?? [];
  if (permissions.length === 0) {
    return true;
  }
  return access.requireAll
    ? permissions.every((permission) =>
        subject.permissions.has(normalizePermission(permission)),
      )
    : permissions.some((permission) =>
        subject.permissions.has(normalizePermission(permission)),
      );
}

/**
 * Single evaluator for `viewAny` and capability gates.
 * Capability: when the gate names one, the subject must hold it (from
 * `authorization.capabilities`) and the permission gate must pass; `roles`
 * are not read.
 * Permissions: any-of by default, all-of with `requireAll`.
 * Roles (legacy gates): any-of after alias expansion (same as the backend
 * guard), or literal match when `exactRoles` is set.
 * Empty gate = allowed. Super-admin bypasses everything.
 */
export function evaluateAccess(
  subject: AccessSubject,
  access: CapabilityGate,
): boolean {
  if (subject.isSuperAdmin) {
    return true;
  }

  if (access.anyOf) {
    return access.anyOf.some((gate) => evaluateAccess(subject, gate));
  }

  if (access.capability) {
    return (
      subject.capabilities.has(access.capability) &&
      permissionsSatisfied(subject, access)
    );
  }

  const permissions = access.permissions ?? [];
  const roles = access.roles ?? [];

  if (permissions.length === 0 && roles.length === 0) {
    return true;
  }

  if (!permissionsSatisfied(subject, access)) {
    return false;
  }

  if (access.exactRoles) {
    return roles.length === 0 || roles.some((role) => subject.roles.has(role));
  }
  return roleGateSatisfied(subject.roles, roles);
}

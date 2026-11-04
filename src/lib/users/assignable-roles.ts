import { ASSIGNABLE_GLOBAL_ROLE_ORDER } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";
import type { AdminCreatableRole } from "@/lib/api/admin-users";

/**
 * `authorization.assignable_global_roles` of `/auth/me`: the global roles the
 * actor may assign when creating users (backend `ROLE_HIERARCHY`). Absent →
 * `[]` (the actor cannot create users).
 */
export function extractAssignableGlobalRoles(
  user: AuthUser | null | undefined,
): string[] {
  const raw = user?.authorization?.assignable_global_roles;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out = new Set<string>();
  for (const value of raw) {
    if (typeof value === "string" && value.trim()) {
      out.add(value.trim().toLowerCase());
    }
  }
  return [...out].sort();
}

/**
 * Assignable roles the new-user form can offer, in display order (highest to
 * lowest). Roles outside `AdminCreatableRole` are dropped: the form has no
 * geography rules for them.
 */
export function resolveCreatableRoles(
  user: AuthUser | null | undefined,
): AdminCreatableRole[] {
  const assignable = new Set(extractAssignableGlobalRoles(user));
  return ASSIGNABLE_GLOBAL_ROLE_ORDER.filter((role) => assignable.has(role));
}

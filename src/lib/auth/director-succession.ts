import { SUPER_ADMIN_ROLE } from "@/lib/auth/roles";

export const DIRECTOR_SUCCESSION_ROLES = [
  SUPER_ADMIN_ROLE,
  "admin",
  "director-lf",
  "assistant-lf",
] as const;

export function canUseDirectorSuccession(roles: Iterable<string>): boolean {
  const normalizedRoles = new Set(
    Array.from(roles, (role) => role.trim().toLowerCase()),
  );

  return DIRECTOR_SUCCESSION_ROLES.some((role) => normalizedRoles.has(role));
}

/**
 * Same roles as `canUseDirectorSuccession`. Determines whether the user
 * may designate a director for a future ecclesiastical year.
 */
export const DIRECTOR_DESIGNATION_ROLES = DIRECTOR_SUCCESSION_ROLES;

export function canDesignateNextDirector(roles: Iterable<string>): boolean {
  const normalizedRoles = new Set(
    Array.from(roles, (role) => role.trim().toLowerCase()),
  );

  return DIRECTOR_DESIGNATION_ROLES.some((role) => normalizedRoles.has(role));
}

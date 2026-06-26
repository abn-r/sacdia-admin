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

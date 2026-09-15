/**
 * Mirror of `GLOBAL_ROLE_ALIASES` in
 * `sacdia-backend/src/common/guards/global-roles.guard.ts`.
 *
 * When an endpoint declares `@GlobalRoles(R)`, the guard lets through any
 * actor holding one of `ALIASES[R]`. The catalog copies `@GlobalRoles`
 * literally, so the UI must expand the same way or it hides buttons the API
 * would accept (e.g. assistant-admin on an `admin` gate).
 *
 * Keep in sync by hand; `screen-catalog.test.ts` checks this table against
 * the backend file when the workspace has it.
 */
const FIELD_ADMIN_ROLES = [
  "director-lf",
  "assistant-lf",
  "director-union",
  "assistant-union",
  "director-dia",
  "assistant-dia",
] as const;

export const GLOBAL_ROLE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "super-admin": ["super-admin"],
  admin: ["admin", "assistant-admin"],
  "assistant-admin": ["assistant-admin", "admin"],
  coordinator: [
    "coordinator",
    "zone-coordinator",
    "general-coordinator",
    "director-lf",
    "assistant-lf",
  ],
  "zone-coordinator": ["zone-coordinator", "general-coordinator"],
  "general-coordinator": ["general-coordinator"],
  pastor: ["pastor"],
  user: ["user"],
  "director-lf": FIELD_ADMIN_ROLES,
  "assistant-lf": FIELD_ADMIN_ROLES,
  "director-union": FIELD_ADMIN_ROLES,
  "assistant-union": FIELD_ADMIN_ROLES,
  "director-dia": FIELD_ADMIN_ROLES,
  "assistant-dia": FIELD_ADMIN_ROLES,
};

/** Roles that satisfy a gate declaring `requiredRoles` (deduplicated). */
export function expandRequiredRoles(requiredRoles: readonly string[]): string[] {
  const out = new Set<string>();
  for (const role of requiredRoles) {
    for (const alias of GLOBAL_ROLE_ALIASES[role] ?? [role]) {
      out.add(alias);
    }
  }
  return Array.from(out);
}

export function roleGateSatisfied(
  actorRoles: ReadonlySet<string>,
  requiredRoles: readonly string[],
): boolean {
  if (requiredRoles.length === 0) {
    return true;
  }
  return expandRequiredRoles(requiredRoles).some((role) => actorRoles.has(role));
}

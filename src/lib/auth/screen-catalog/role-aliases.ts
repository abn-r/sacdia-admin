import { GLOBAL_ROLE_ALIASES } from "../generated/role-aliases";

/**
 * `GLOBAL_ROLE_ALIASES` is generated from the backend
 * (`sacdia-backend/src/common/authorization/generated/role-aliases.ts`,
 * copied here by `pnpm authz:generate`). No manual sync.
 *
 * When an endpoint declares `@GlobalRoles(R)`, the guard lets through any
 * actor holding one of `ALIASES[R]`. The catalog copies `@GlobalRoles`
 * literally, so the UI must expand the same way or it hides buttons the API
 * would accept (e.g. assistant-admin on an `admin` gate).
 */
export { GLOBAL_ROLE_ALIASES };

const ALIASES_BY_NAME = GLOBAL_ROLE_ALIASES as Readonly<
  Record<string, readonly string[] | undefined>
>;

/** Roles that satisfy a gate declaring `requiredRoles` (deduplicated). */
export function expandRequiredRoles(requiredRoles: readonly string[]): string[] {
  const out = new Set<string>();
  for (const role of requiredRoles) {
    for (const alias of ALIASES_BY_NAME[role] ?? [role]) {
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

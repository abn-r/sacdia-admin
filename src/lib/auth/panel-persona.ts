import type { AuthUser } from "@/lib/auth/types";
import { extractRoles } from "@/lib/auth/roles";
import { resolveAdminTerritoryScope } from "@/lib/auth/territory-scope";

export type PanelPersona =
  | "lf-coordinator"
  | "union-coordinator"
  | "division-coordinator"
  | "admin";

const LF_ROLES = new Set(["director-lf", "assistant-lf"]);
const UNION_ROLES = new Set(["director-union", "assistant-union"]);
const DIVISION_ROLES = new Set(["director-dia", "assistant-dia"]);

/**
 * Panel personas that can authenticate via hasAdminRole().
 * Club-level directors/secretaries use the mobile app — not the admin panel.
 */
export function resolvePanelPersona(
  user: AuthUser | null | undefined,
): PanelPersona {
  const roles = new Set(extractRoles(user));

  if ([...LF_ROLES].some((role) => roles.has(role))) {
    return "lf-coordinator";
  }
  if ([...UNION_ROLES].some((role) => roles.has(role))) {
    return "union-coordinator";
  }
  if ([...DIVISION_ROLES].some((role) => roles.has(role))) {
    return "division-coordinator";
  }

  return "admin";
}

export function shouldShowCoordinatorLfHome(
  user: AuthUser | null | undefined,
): boolean {
  if (resolvePanelPersona(user) !== "lf-coordinator") return false;
  const scope = resolveAdminTerritoryScope(user);
  return scope.level === "local_field" || scope.level === "all";
}

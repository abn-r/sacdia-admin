import { canViewScreen } from "@/lib/auth/screen-catalog";
import { readAuthorizationTerritory } from "@/lib/auth/territory-scope";
import type { AuthUser } from "@/lib/auth/types";

/**
 * `GET /finances/overview` answers 403 unless the actor holds finances:read
 * through a GLOBAL role AND is anchored to a territory (`authorization.territory`
 * is `all`, `division`, `union` or `local_field`). Club-only roles resolve to
 * `open` and `unconfigured` accounts are blocked by the layout, so both stay out.
 */
export function canViewFinancesOverview(
  user: AuthUser | null | undefined,
): boolean {
  if (!user || !canViewScreen(user, "finances")) return false;
  const level = readAuthorizationTerritory(user).level;
  return (
    level === "all" ||
    level === "division" ||
    level === "union" ||
    level === "local_field"
  );
}

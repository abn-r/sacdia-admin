import { hasAnyPermission, hasAnyRole } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_UPDATE,
  CAMPOREES_UPDATE,
} from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/types";

const GLOBAL_ADMIN_ROLES = ["admin", "super-admin"] as const;
const LOCAL_MANAGER_ROLES = ["assistant-lf", "director-lf"] as const;
const UNION_MANAGER_ROLES = ["assistant-union", "director-union"] as const;

/**
 * Who may assign / replace / remove event judge assignments in admin.
 *
 * - Local camporee: assistant-lf, director-lf
 * - Union camporee: assistant-union, director-union
 * - Always: admin, super-admin
 * - Also: anyone with camporee_events:update / camporees:update (API guard)
 */
export function canManageCamporeeJudgeAssignments(
  user: AuthUser | null | undefined,
  options: { isUnion?: boolean } = {},
): boolean {
  if (hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE])) {
    return true;
  }

  if (hasAnyRole(user, GLOBAL_ADMIN_ROLES)) {
    return true;
  }

  if (options.isUnion) {
    return hasAnyRole(user, UNION_MANAGER_ROLES);
  }

  return hasAnyRole(user, LOCAL_MANAGER_ROLES);
}

import { canCapability } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";

/**
 * Accesos surfaces on user-detail (`access_app`, `access_panel`, `active`):
 * Roles-tab switches, Resumen read-only grid, and sticky aside rows.
 * Same gate as PATCH `/admin/users/:userId`: `users:update_admin` plus
 * `@GlobalRoles('admin', 'super-admin')`. `assistant-admin` satisfies the
 * `admin` alias. Super-admin bypasses the permission check.
 */
export function canManageUserAccessFlags(
  user: AuthUser | null | undefined,
): boolean {
  return canCapability(user, "users", "update_admin");
}

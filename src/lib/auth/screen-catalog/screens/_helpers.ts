import { CATALOG_EDITOR_ROLES } from "@/lib/auth/catalog-editor-access";
import { SUPER_ADMIN_ROLE } from "@/lib/auth/roles";

import type { NavAccess, ScreenDefinition, ScreenSurface } from "../types";

export const ADMIN_ROLES = ["admin", SUPER_ADMIN_ROLE] as const;

/**
 * `USER_MANAGEMENT_ROLES` in `sacdia-backend/src/admin/admin-users.controller.ts`.
 * admin + the six field-level roles (lf / union / dia).
 */
export const USER_MANAGEMENT_ROLES = [
  "admin",
  SUPER_ADMIN_ROLE,
  "director-lf",
  "assistant-lf",
  "director-union",
  "assistant-union",
  "director-dia",
  "assistant-dia",
] as const;

export function catalogEditorAccess(permissions: string[]): NavAccess {
  return { permissions, roles: [...CATALOG_EDITOR_ROLES] };
}

export function roleOnlyAccess(roles: readonly string[]): NavAccess {
  return { permissions: [], roles: [...roles] };
}

/** Screen with `viewAny` only (no verbs wired yet). Path comes from the sidebar. */
export function viewOnlyScreen(
  id: string,
  viewAny: NavAccess,
  options?: { surfaces?: ScreenSurface[]; path?: string },
): ScreenDefinition {
  return {
    id,
    surfaces: options?.surfaces ?? ["admin"],
    ...(options?.path ? { path: options.path } : {}),
    viewAny,
    capabilities: [],
  };
}

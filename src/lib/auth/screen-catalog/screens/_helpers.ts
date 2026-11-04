import type { CapabilityKey } from "@/lib/auth/generated/capability-keys";

import type { CapabilityGate, NavAccess, ScreenDefinition, ScreenSurface } from "../types";

/**
 * Gate decided by a backend capability (`authorization.capabilities`) plus
 * optional permissions. Role rules stay on the API side.
 */
export function capabilityAccess(
  capability: CapabilityKey,
  permissions: string[] = [],
  options?: { requireAll?: boolean },
): CapabilityGate {
  return {
    permissions,
    roles: [],
    capability,
    ...(options?.requireAll ? { requireAll: true } : {}),
  };
}

/**
 * Catalog editor controllers (`@GlobalRoles('admin','super-admin')`):
 * `catalogs.edit` + the entity permission.
 */
export function catalogEditorAccess(permissions: string[]): CapabilityGate {
  return capabilityAccess("catalogs.edit", permissions);
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

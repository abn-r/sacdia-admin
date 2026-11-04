import {
  ACHIEVEMENTS_MANAGE,
  AUDIT_READ,
  MATERIALS_CONFIGURE,
  PERMISSIONS_ASSIGN,
  PERMISSIONS_READ,
  ROLES_READ,
  SCORING_CATEGORIES_READ,
} from "@/lib/auth/permissions";

import type { CapabilityGate, ScreenDefinition } from "../types";
import { capabilityAccess, catalogEditorAccess, viewOnlyScreen } from "./_helpers";

/**
 * Every write in `RbacController` (`/admin/rbac/*`) is
 * `@GlobalRoles('super-admin')` + `@RequirePermissions('permissions:assign')`
 * → `rbac.manage` + `permissions:assign`.
 */
const RBAC_WRITE: CapabilityGate = capabilityAccess("rbac.manage", [PERMISSIONS_ASSIGN]);

export const adminSystemScreens: ScreenDefinition[] = [
  {
    id: "admin-local-field-payment-methods",
    surfaces: ["admin"],
    viewAny: { permissions: [MATERIALS_CONFIGURE] },
    capabilities: [
      {
        id: "materials_config",
        kind: "route",
        href: "/dashboard/materials/config",
        gate: { permissions: [MATERIALS_CONFIGURE] },
      },
      // PATCH materials/config, PATCH materials/config/:localFieldId
      { id: "configure", kind: "button", gate: { permissions: [MATERIALS_CONFIGURE] } },
    ],
  },
  {
    id: "admin-local-field-delivery",
    surfaces: ["admin"],
    viewAny: { permissions: [MATERIALS_CONFIGURE] },
    capabilities: [
      { id: "configure", kind: "button", gate: { permissions: [MATERIALS_CONFIGURE] } },
    ],
  },

  // `/divisions/scoring-categories` is `@GlobalRoles('admin', 'super-admin')` +
  // `scoring_categories:read`. Field roles hold the permission but the API
  // rejects them, so the page needs `catalogs.edit` too.
  viewOnlyScreen(
    "admin-settings-scoring-categories",
    catalogEditorAccess([SCORING_CATEGORIES_READ]),
  ),

  viewOnlyScreen("admin-system-variables", capabilityAccess("system.config.read")),
  {
    id: "admin-system-jobs",
    surfaces: ["admin"],
    viewAny: capabilityAccess("system.config.read"),
    // POST /admin/system/jobs/:name/run — super-admin only (`system.jobs.run`).
    capabilities: [{ id: "run", kind: "button", gate: capabilityAccess("system.jobs.run") }],
  },
  viewOnlyScreen("admin-system-jobs-history", capabilityAccess("system.config.read")),
  // `/admin/achievements` is `@GlobalRoles('admin', 'super-admin')` +
  // `achievements:manage`. Field roles also hold the permission, but the API
  // answers them 403, so the page needs `catalogs.edit` too.
  {
    id: "admin-system-achievements",
    surfaces: ["admin"],
    viewAny: catalogEditorAccess([ACHIEVEMENTS_MANAGE]),
    capabilities: [
      // POST/PATCH/DELETE achievement-categories and achievements.
      { id: "manage", kind: "button", gate: catalogEditorAccess([ACHIEVEMENTS_MANAGE]) },
    ],
  },
  viewOnlyScreen(
    "admin-system-audit",
    capabilityAccess("audit.read_system", [AUDIT_READ]),
  ),

  {
    id: "admin-system-roles",
    surfaces: ["admin"],
    viewAny: { permissions: [ROLES_READ] },
    capabilities: [
      {
        // /dashboard/configuration index (not a sidebar leaf).
        id: "configuration_index",
        kind: "route",
        href: "/dashboard/configuration",
        gate: { permissions: [PERMISSIONS_READ, ROLES_READ] },
      },
      // POST/PATCH/DELETE roles, POST/PUT/DELETE roles/:id/permissions
      { id: "manage", kind: "button", gate: RBAC_WRITE },
    ],
  },
  {
    id: "admin-system-permissions",
    surfaces: ["admin"],
    viewAny: { permissions: [PERMISSIONS_READ] },
    capabilities: [
      // POST/PATCH/DELETE permissions
      { id: "manage", kind: "button", gate: RBAC_WRITE },
      {
        // POST/DELETE users/:userId/permissions (direct grants)
        id: "user_grants",
        kind: "route",
        href: "/dashboard/rbac/user-permissions",
        gate: RBAC_WRITE,
      },
    ],
  },
  {
    id: "admin-system-matrix",
    surfaces: ["admin"],
    viewAny: {
      permissions: [ROLES_READ, PERMISSIONS_READ],
      requireAll: true,
    },
    // POST/PUT/DELETE roles/:id/permissions from the grid
    capabilities: [{ id: "write", kind: "button", gate: RBAC_WRITE }],
  },
];

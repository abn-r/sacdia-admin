import { CATALOG_EDITOR_ROLES } from "@/lib/auth/catalog-editor-access";
import {
  ACHIEVEMENTS_MANAGE,
  AUDIT_READ,
  MATERIALS_CONFIGURE,
  PERMISSIONS_ASSIGN,
  PERMISSIONS_READ,
  ROLES_READ,
  SCORING_CATEGORIES_READ,
} from "@/lib/auth/permissions";
import { SUPER_ADMIN_ROLE } from "@/lib/auth/roles";

import type { CapabilityGate, ScreenDefinition } from "../types";
import { roleOnlyAccess, viewOnlyScreen } from "./_helpers";

/**
 * Every write in `RbacController` (`/admin/rbac/*`) is
 * `@GlobalRoles('super-admin')` + `@RequirePermissions('permissions:assign')`.
 */
const RBAC_WRITE: CapabilityGate = {
  permissions: [PERMISSIONS_ASSIGN],
  roles: [SUPER_ADMIN_ROLE],
};

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

  viewOnlyScreen("admin-settings-scoring-categories", {
    permissions: [SCORING_CATEGORIES_READ],
  }),

  viewOnlyScreen("admin-system-variables", roleOnlyAccess(CATALOG_EDITOR_ROLES)),
  viewOnlyScreen("admin-system-jobs", roleOnlyAccess(CATALOG_EDITOR_ROLES)),
  viewOnlyScreen(
    "admin-system-jobs-history",
    roleOnlyAccess(CATALOG_EDITOR_ROLES),
  ),
  viewOnlyScreen("admin-system-achievements", {
    permissions: [ACHIEVEMENTS_MANAGE],
  }),
  viewOnlyScreen("admin-system-audit", {
    permissions: [AUDIT_READ],
    roles: [SUPER_ADMIN_ROLE],
  }),

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

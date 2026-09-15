import {
  CLASSES_READ,
  CLASSES_SUBMIT_PROGRESS,
  CLUBS_UPDATE,
  MATERIALS_CREATE,
  UNITS_UPDATE,
  USERS_READ_DETAIL,
} from "@/lib/auth/permissions";

import type { ScreenDefinition } from "../types";
import { roleOnlyAccess } from "./_helpers";

/**
 * App-only screens (Flutter). Admin screens that the app also shows keep
 * `surfaces: ["admin", "app"]` in their family file; this file is the rest.
 *
 * Paths are Flutter routes (`RouteNames`), not `/dashboard/*`.
 */
export const appScreens: ScreenDefinition[] = [
  {
    id: "coordinator-hub",
    path: "/coordinator",
    surfaces: ["app"],
    // analytics.controller.ts L63-64 GET sla-dashboard
    // class @SkipPermissions + method @GlobalRoles('admin','coordinator').
    // Distinct from admin `coordination` (`/admin/coordination` =
    // coordination:manage + USER_MANAGEMENT_ROLES). director-lf / assistant-lf
    // enter via coordinator alias; union/dia do not.
    viewAny: roleOnlyAccess(["admin", "coordinator"]),
    capabilities: [],
  },
  {
    id: "app-members",
    path: "/home/members",
    surfaces: ["app"],
    viewAny: { permissions: [USERS_READ_DETAIL] },
    capabilities: [],
  },
  {
    id: "app-club",
    path: "/home/club",
    surfaces: ["app"],
    // Management shortcut. GET club info is clubs:read; tile stays clubs:update
    // so members with read-only do not see it.
    viewAny: { permissions: [CLUBS_UPDATE] },
    capabilities: [],
  },
  {
    id: "app-units",
    path: "/home/units",
    surfaces: ["app"],
    // GET clubs/:clubId/units is units:read (also seeded on member). Tile is
    // the management verb units.controller.ts L89+.
    viewAny: { permissions: [UNITS_UPDATE] },
    capabilities: [],
  },
  {
    id: "app-grouped-class",
    path: "/home/grouped-class",
    surfaces: ["app"],
    // UserClassesController writes: classes.controller.ts L179+.
    viewAny: { permissions: [CLASSES_SUBMIT_PROGRESS] },
    capabilities: [],
  },
  {
    id: "app-materials",
    path: "/home/materials",
    surfaces: ["app"],
    // POST /materials/orders — orders.controller.ts L73-74. Inbox is
    // materiales:read (admin materials-inbox).
    viewAny: { permissions: [MATERIALS_CREATE] },
    capabilities: [],
  },
  {
    id: "app-classes",
    path: "/home/classes",
    surfaces: ["app"],
    // GET user classes — classes.controller.ts L157.
    viewAny: { permissions: [CLASSES_READ] },
    capabilities: [],
  },
];

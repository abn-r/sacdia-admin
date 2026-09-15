import {
  CAMPOREE_EVENT_TYPES_READ,
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_READ,
  CATALOGS_UPDATE,
  ECCLESIASTICAL_YEARS_CREATE,
  ECCLESIASTICAL_YEARS_DELETE,
  ECCLESIASTICAL_YEARS_READ,
  ECCLESIASTICAL_YEARS_UPDATE,
  HONOR_CATEGORIES_CREATE,
  HONOR_CATEGORIES_DELETE,
  HONOR_CATEGORIES_READ,
  HONOR_CATEGORIES_UPDATE,
  HONORS_CREATE,
  HONORS_DELETE,
  HONORS_READ,
  HONORS_UPDATE,
} from "@/lib/auth/permissions";

import type { ScreenCapability, ScreenDefinition } from "../types";
import { catalogEditorAccess } from "./_helpers";
import { CAMPOREE_EVENT_TYPE_CAPABILITIES } from "./campamentos";

/**
 * Domain catalogs: academics (classes), health, business, honors, activity
 * types, ecclesiastical years (`/dashboard/catalogs/*`).
 * Backend: `admin-reference.controller.ts`, `admin-phase-e-catalogs.controller.ts`.
 * Class-level `@GlobalRoles('admin','super-admin')` on both — method does not
 * override, so every gate uses `catalogEditorAccess`.
 * `catalogs-certifications` lives in `investiture.ts`;
 * `catalogs-camporee-event-types` capabilities come from `campamentos.ts`.
 */
function catalogCrud(
  create: string,
  update: string,
  deletePermission: string,
): ScreenCapability[] {
  return [
    { id: "create", kind: "button", gate: catalogEditorAccess([create]) },
    { id: "update", kind: "button", gate: catalogEditorAccess([update]) },
    {
      id: "delete",
      kind: "button",
      gate: catalogEditorAccess([deletePermission]),
    },
  ];
}

function catalogScreen(
  id: string,
  viewAny: string,
  create: string,
  update: string,
  deletePermission: string,
): ScreenDefinition {
  return {
    id,
    surfaces: ["admin"],
    viewAny: catalogEditorAccess([viewAny]),
    capabilities: catalogCrud(create, update, deletePermission),
  };
}

export const catalogsDomainScreens: ScreenDefinition[] = [
  // admin-phase-e-catalogs.controller.ts L114-L166 (classes) and
  // L172-L317 (class honors / prerequisites share the same catalogs:* verbs).
  catalogScreen(
    "catalogs-classes",
    CATALOGS_READ,
    CATALOGS_CREATE,
    CATALOGS_UPDATE,
    CATALOGS_DELETE,
  ),
  // admin-phase-e-catalogs.controller.ts L324-L387
  catalogScreen(
    "catalogs-class-modules",
    CATALOGS_READ,
    CATALOGS_CREATE,
    CATALOGS_UPDATE,
    CATALOGS_DELETE,
  ),
  // admin-phase-e-catalogs.controller.ts L393-L458
  catalogScreen(
    "catalogs-class-sections",
    CATALOGS_READ,
    CATALOGS_CREATE,
    CATALOGS_UPDATE,
    CATALOGS_DELETE,
  ),
  // admin-reference.controller.ts L90-L140
  catalogScreen(
    "catalogs-activity-types",
    CATALOGS_READ,
    CATALOGS_CREATE,
    CATALOGS_UPDATE,
    CATALOGS_DELETE,
  ),
  // admin-reference.controller.ts L526-L576
  catalogScreen(
    "catalogs-ecclesiastical-years",
    ECCLESIASTICAL_YEARS_READ,
    ECCLESIASTICAL_YEARS_CREATE,
    ECCLESIASTICAL_YEARS_UPDATE,
    ECCLESIASTICAL_YEARS_DELETE,
  ),
  // admin-reference.controller.ts L194-L244
  catalogScreen(
    "catalogs-allergies",
    CATALOGS_READ,
    CATALOGS_CREATE,
    CATALOGS_UPDATE,
    CATALOGS_DELETE,
  ),
  // admin-reference.controller.ts L246-L296
  catalogScreen(
    "catalogs-diseases",
    CATALOGS_READ,
    CATALOGS_CREATE,
    CATALOGS_UPDATE,
    CATALOGS_DELETE,
  ),
  // admin-reference.controller.ts L474-L524
  catalogScreen(
    "catalogs-medicines",
    CATALOGS_READ,
    CATALOGS_CREATE,
    CATALOGS_UPDATE,
    CATALOGS_DELETE,
  ),
  // admin-reference.controller.ts L142-L192
  catalogScreen(
    "catalogs-relationship-types",
    CATALOGS_READ,
    CATALOGS_CREATE,
    CATALOGS_UPDATE,
    CATALOGS_DELETE,
  ),
  // admin-phase-e-catalogs.controller.ts L464-L521
  catalogScreen(
    "catalogs-finance-categories",
    CATALOGS_READ,
    CATALOGS_CREATE,
    CATALOGS_UPDATE,
    CATALOGS_DELETE,
  ),
  // admin-phase-e-catalogs.controller.ts L527-L586
  catalogScreen(
    "catalogs-inventory-categories",
    CATALOGS_READ,
    CATALOGS_CREATE,
    CATALOGS_UPDATE,
    CATALOGS_DELETE,
  ),
  // admin-reference.controller.ts L414-L472
  catalogScreen(
    "catalogs-honor-categories",
    HONOR_CATEGORIES_READ,
    HONOR_CATEGORIES_CREATE,
    HONOR_CATEGORIES_UPDATE,
    HONOR_CATEGORIES_DELETE,
  ),
  // admin-phase-e-catalogs.controller.ts L593-L645
  catalogScreen(
    "catalogs-honors",
    HONORS_READ,
    HONORS_CREATE,
    HONORS_UPDATE,
    HONORS_DELETE,
  ),
  // admin-phase-e-catalogs.controller.ts L651-722
  // Same honors:* keys as catalogs-honors (matrix groups them there).
  catalogScreen(
    "catalogs-master-honors",
    HONORS_READ,
    HONORS_CREATE,
    HONORS_UPDATE,
    HONORS_DELETE,
  ),

  {
    id: "catalogs-camporee-event-types",
    surfaces: ["admin"],
    viewAny: catalogEditorAccess([CAMPOREE_EVENT_TYPES_READ]),
    capabilities: CAMPOREE_EVENT_TYPE_CAPABILITIES,
  },
];

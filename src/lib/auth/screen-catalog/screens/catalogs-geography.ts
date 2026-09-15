import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_READ,
  CATALOGS_UPDATE,
  CHURCHES_CREATE,
  CHURCHES_DELETE,
  CHURCHES_READ,
  CHURCHES_UPDATE,
  COUNTRIES_CREATE,
  COUNTRIES_DELETE,
  COUNTRIES_READ,
  COUNTRIES_UPDATE,
  LOCAL_FIELDS_CREATE,
  LOCAL_FIELDS_DELETE,
  LOCAL_FIELDS_READ,
  LOCAL_FIELDS_UPDATE,
  UNIONS_CREATE,
  UNIONS_DELETE,
  UNIONS_READ,
  UNIONS_UPDATE,
} from "@/lib/auth/permissions";
import { SUPER_ADMIN_ROLE } from "@/lib/auth/roles";

import type { ScreenCapability, ScreenDefinition } from "../types";
import { catalogEditorAccess } from "./_helpers";

/**
 * Geography + club taxonomy catalogs (`/dashboard/catalogs/*`).
 *
 * Geography: `admin-geography.controller.ts` class
 * `@GlobalRoles('admin','super-admin')` → `catalogEditorAccess`.
 * Club ideals/types: `admin-reference.controller.ts` class same fence;
 * POST/DELETE override to `@GlobalRoles('super-admin')`.
 */
function editorCrud(
  create: string,
  update: string,
  destroy: string,
): ScreenCapability[] {
  return [
    { id: "create", kind: "button", gate: catalogEditorAccess([create]) },
    { id: "update", kind: "button", gate: catalogEditorAccess([update]) },
    { id: "delete", kind: "button", gate: catalogEditorAccess([destroy]) },
  ];
}

function editorScreen(
  id: string,
  viewPermission: string,
  capabilities: ScreenCapability[],
): ScreenDefinition {
  return {
    id,
    surfaces: ["admin"],
    viewAny: catalogEditorAccess([viewPermission]),
    capabilities,
  };
}

/** POST/DELETE club ideals and club types: method `@GlobalRoles('super-admin')`. */
const SUPER_ADMIN_CATALOG_MUTATIONS: ScreenCapability[] = [
  {
    id: "create",
    kind: "button",
    gate: { permissions: [CATALOGS_CREATE], roles: [SUPER_ADMIN_ROLE] },
  },
  {
    id: "update",
    kind: "button",
    gate: catalogEditorAccess([CATALOGS_UPDATE]),
  },
  {
    id: "delete",
    kind: "button",
    gate: { permissions: [CATALOGS_DELETE], roles: [SUPER_ADMIN_ROLE] },
  },
];

export const catalogsGeographyScreens: ScreenDefinition[] = [
  // GET/POST/PATCH/DELETE /admin/divisions → countries:{read,create,update,delete}
  // (admin-geography.controller.ts:64-109). viewAny dropped `unions:read`
  // (GET does not accept it).
  editorScreen(
    "catalogs-divisions",
    COUNTRIES_READ,
    editorCrud(COUNTRIES_CREATE, COUNTRIES_UPDATE, COUNTRIES_DELETE),
  ),
  // GET/POST/PATCH/DELETE /admin/countries → countries:* (L112-156).
  editorScreen(
    "catalogs-countries",
    COUNTRIES_READ,
    editorCrud(COUNTRIES_CREATE, COUNTRIES_UPDATE, COUNTRIES_DELETE),
  ),
  // GET/POST/PATCH/DELETE /admin/unions → unions:* (L158-209).
  editorScreen(
    "catalogs-unions",
    UNIONS_READ,
    editorCrud(UNIONS_CREATE, UNIONS_UPDATE, UNIONS_DELETE),
  ),
  // GET/POST/PATCH/DELETE /admin/local-fields → local_fields:* (L211-276).
  editorScreen(
    "catalogs-local-fields",
    LOCAL_FIELDS_READ,
    editorCrud(LOCAL_FIELDS_CREATE, LOCAL_FIELDS_UPDATE, LOCAL_FIELDS_DELETE),
  ),
  // GET /admin/districts → local_fields:read (L278-279), not districts:read.
  // POST/PATCH → local_fields:update (L291-299); DELETE → local_fields:delete (L314-315).
  editorScreen(
    "catalogs-districts",
    LOCAL_FIELDS_READ,
    editorCrud(LOCAL_FIELDS_UPDATE, LOCAL_FIELDS_UPDATE, LOCAL_FIELDS_DELETE),
  ),
  // GET/POST/PATCH/DELETE /admin/churches → churches:* (L328-376).
  editorScreen(
    "catalogs-churches",
    CHURCHES_READ,
    editorCrud(CHURCHES_CREATE, CHURCHES_UPDATE, CHURCHES_DELETE),
  ),

  // GET /admin/club-ideals → catalogs:read (admin-reference.controller.ts:298-299).
  // POST L306-308 super-admin + catalogs:create; PATCH L321-322 catalogs:update;
  // DELETE L339-341 super-admin + catalogs:delete.
  // `club_ideals:*` is not seeded and the API does not accept it.
  {
    id: "catalogs-club-ideals",
    surfaces: ["admin"],
    viewAny: catalogEditorAccess([CATALOGS_READ]),
    capabilities: SUPER_ADMIN_CATALOG_MUTATIONS,
  },
  // GET /admin/club-types → catalogs:read (L358-359). Same write fence as ideals
  // (POST L366-368, PATCH L381-382, DELETE L399-401). `club_types:*` not seeded.
  {
    id: "catalogs-club-types",
    surfaces: ["admin"],
    viewAny: catalogEditorAccess([CATALOGS_READ]),
    capabilities: SUPER_ADMIN_CATALOG_MUTATIONS,
  },
];

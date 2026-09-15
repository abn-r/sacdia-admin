import {
  ACTIVITIES_CREATE,
  ACTIVITIES_READ,
  ACTIVITIES_UPDATE,
  AWARD_CATEGORIES_READ,
  CLUB_MEMBERS_APPROVE,
  CLUB_ROLES_ASSIGN,
  CLUB_ROLES_REVOKE,
  CLUBS_READ,
  COORDINATION_MANAGE,
  ECCLESIASTICAL_YEARS_UPDATE,
  MEMBER_RANKING_WEIGHTS_READ,
  MOM_SUPERVISE,
  RANKING_WEIGHTS_READ,
  RANKINGS_READ,
  REPORTS_READ,
  REQUESTS_READ,
  SECTION_RANKINGS_READ_CLUB,
  SECTION_RANKINGS_READ_GLOBAL,
  SECTION_RANKINGS_READ_LF,
  VALIDATION_READ,
} from "@/lib/auth/permissions";

import { SUPER_ADMIN_ROLE } from "@/lib/auth/roles";

import type { ScreenDefinition } from "../types";
import {
  catalogEditorAccess,
  USER_MANAGEMENT_ROLES,
  viewOnlyScreen,
} from "./_helpers";

const EVIDENCE_FOLDERS_READ = "evidence_folders:read";
const ANNUAL_FOLDERS_EVALUATE = "annual_folders:evaluate";
const ANNUAL_FOLDER_TEMPLATES_READ = "annual_folder_templates:read";

/**
 * Literal global roles for director designation and annual succession.
 * Designation: `ALLOWED_DESIGNATION_ROLES` in
 * `sacdia-backend/src/clubs/director-designation.service.ts`.
 * Succession: `assertCanSucceedSectionDirector` in
 * `sacdia-backend/src/clubs/clubs.service.ts:1694-1700`.
 * Compared literally (not via GlobalRolesGuard) → `exactRoles`.
 */
const DIRECTOR_FIELD_AND_ADMIN_ROLES = [
  SUPER_ADMIN_ROLE,
  "admin",
  "director-lf",
  "assistant-lf",
] as const;

export const clubsScreens: ScreenDefinition[] = [
  {
    id: "clubs",
    surfaces: ["admin"],
    viewAny: { permissions: [CLUBS_READ] },
    capabilities: [
      // POST/DELETE /clubs/:clubId/sections/:sectionId/roles*
      { id: "manage_roles", kind: "button", gate: { permissions: [CLUB_ROLES_ASSIGN] } },
      {
        // POST /clubs/:clubId/sections/:sectionId/director-designation
        id: "designate_director",
        kind: "button",
        gate: {
          permissions: [CLUB_ROLES_ASSIGN],
          roles: [...DIRECTOR_FIELD_AND_ADMIN_ROLES],
          exactRoles: true,
        },
      },
      {
        // POST /clubs/:clubId/sections/:sectionId/director-succession
        // @RequirePermissions assign+revoke + hasAnyGlobalRole literal list.
        id: "succeed_director",
        kind: "button",
        gate: {
          permissions: [CLUB_ROLES_ASSIGN, CLUB_ROLES_REVOKE],
          requireAll: true,
          roles: [...DIRECTOR_FIELD_AND_ADMIN_ROLES],
          exactRoles: true,
        },
      },
    ],
  },
  {
    id: "coordination",
    surfaces: ["admin"],
    // coordination.controller.ts:44-55 class-level
    // @RequirePermissions('coordination:manage') + @GlobalRoles matching
    // USER_MANAGEMENT_ROLES (admin/super-admin + lf/union/dia).
    viewAny: {
      permissions: [COORDINATION_MANAGE],
      roles: [...USER_MANAGEMENT_ROLES],
    },
    capabilities: [],
  },
  {
    id: "activities",
    surfaces: ["admin", "app"],
    // GET clubs/:clubId/activities — activities.controller.ts:65. No @GlobalRoles.
    // ClubRoles on writes is club-assignment scoped, stays API-side.
    viewAny: { permissions: [ACTIVITIES_READ] },
    capabilities: [
      { id: "create", kind: "button", gate: { permissions: [ACTIVITIES_CREATE] } },
      { id: "update", kind: "button", gate: { permissions: [ACTIVITIES_UPDATE] } },
    ],
  },

  viewOnlyScreen("requests-transfers", { permissions: [REQUESTS_READ] }),
  viewOnlyScreen("requests-assignments", { permissions: [REQUESTS_READ] }),
  viewOnlyScreen("requests-membership", {
    permissions: [CLUB_MEMBERS_APPROVE],
  }),

  viewOnlyScreen("validations-investitures", {
    permissions: [VALIDATION_READ],
  }),

  viewOnlyScreen("clubs-evidence-folders-templates", {
    permissions: [EVIDENCE_FOLDERS_READ],
  }),
  viewOnlyScreen("clubs-evidence-folders-list", {
    permissions: [EVIDENCE_FOLDERS_READ],
  }, { surfaces: ["admin", "app"] }),

  {
    id: "annual-folders-evaluate",
    surfaces: ["admin"],
    viewAny: { permissions: [ANNUAL_FOLDERS_EVALUATE] },
    capabilities: [
      {
        // Hub index and deep links under /dashboard/annual-folders that are
        // not sidebar leaves. Union of the tab viewAny keys.
        id: "hub",
        kind: "route",
        href: "/dashboard/annual-folders",
        gate: {
          permissions: [
            ANNUAL_FOLDERS_EVALUATE,
            RANKINGS_READ,
            ANNUAL_FOLDER_TEMPLATES_READ,
          ],
        },
      },
    ],
  },
  viewOnlyScreen("annual-folders-rankings", { permissions: [RANKINGS_READ] }, { surfaces: ["admin", "app"] }),
  viewOnlyScreen("annual-folders-templates", {
    permissions: [ANNUAL_FOLDER_TEMPLATES_READ],
  }),
  viewOnlyScreen("annual-folders-ranking-config", {
    permissions: [RANKING_WEIGHTS_READ, MEMBER_RANKING_WEIGHTS_READ],
  }),
  viewOnlyScreen("annual-folders-categories", {
    permissions: [AWARD_CATEGORIES_READ],
  }),

  viewOnlyScreen("ranking-weights", {
    permissions: [RANKING_WEIGHTS_READ, MEMBER_RANKING_WEIGHTS_READ],
  }),
  viewOnlyScreen("section-rankings", {
    permissions: [
      SECTION_RANKINGS_READ_CLUB,
      SECTION_RANKINGS_READ_LF,
      SECTION_RANKINGS_READ_GLOBAL,
    ],
  }),
  viewOnlyScreen("member-of-month", { permissions: [MOM_SUPERVISE] }),

  viewOnlyScreen("reports-list", { permissions: [REPORTS_READ] }, { surfaces: ["admin", "app"] }),
  viewOnlyScreen("reports-supervision", { permissions: [REPORTS_READ] }),

  viewOnlyScreen(
    "year-end",
    catalogEditorAccess([ECCLESIASTICAL_YEARS_UPDATE]),
  ),
];

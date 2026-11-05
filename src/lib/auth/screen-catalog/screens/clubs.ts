import {
  ACTIVITIES_CREATE,
  ACTIVITIES_READ,
  ACTIVITIES_UPDATE,
  AWARD_CATEGORIES_READ,
  CLUB_MEMBERS_APPROVE,
  CLUB_ROLES_ASSIGN,
  CLUB_ROLES_REVOKE,
  CLUB_SECTIONS_CREATE,
  CLUB_SECTIONS_UPDATE,
  CLUBS_CREATE,
  CLUBS_DELETE,
  CLUBS_READ,
  CLUBS_UPDATE,
  CONSENT_VERIFY,
  COORDINATION_MANAGE,
  ECCLESIASTICAL_YEARS_UPDATE,
  MEMBER_RANKING_WEIGHTS_READ,
  MEMBER_RANKINGS_READ_CLUB,
  MEMBER_RANKINGS_READ_DIVISION,
  MEMBER_RANKINGS_READ_GLOBAL,
  MEMBER_RANKINGS_READ_LF,
  MEMBER_RANKINGS_READ_SECTION,
  MEMBER_RANKINGS_READ_UNION,
  MOM_SUPERVISE,
  RANKING_WEIGHTS_READ,
  RANKINGS_READ,
  REPORTS_DOWNLOAD,
  REPORTS_READ,
  REPORTS_UPDATE,
  REQUESTS_READ,
  REQUESTS_REVIEW,
  SECTION_RANKINGS_READ_CLUB,
  SECTION_RANKINGS_READ_DIVISION,
  SECTION_RANKINGS_READ_GLOBAL,
  SECTION_RANKINGS_READ_LF,
  SECTION_RANKINGS_READ_UNION,
  VALIDATION_READ,
} from "@/lib/auth/permissions";

import type { ScreenDefinition } from "../types";
import { capabilityAccess, catalogEditorAccess, viewOnlyScreen } from "./_helpers";

const EVIDENCE_FOLDERS_READ = "evidence_folders:read";
const ANNUAL_FOLDERS_EVALUATE = "annual_folders:evaluate";
const ANNUAL_FOLDER_TEMPLATES_READ = "annual_folder_templates:read";
const ANNUAL_FOLDER_TEMPLATES_DELETE = "annual_folder_templates:delete";

function reportsPeriodicScreen(id: string): ScreenDefinition {
  return {
    id,
    surfaces: ["admin"],
    viewAny: { permissions: [REPORTS_READ] },
    capabilities: [
      { id: "generate", kind: "button", gate: { permissions: [REPORTS_UPDATE] } },
      // Manual data form and Recalcular.
      { id: "update", kind: "button", gate: { permissions: [REPORTS_UPDATE] } },
      { id: "finalize", kind: "button", gate: { permissions: [REPORTS_UPDATE] } },
      { id: "download", kind: "button", gate: { permissions: [REPORTS_DOWNLOAD] } },
    ],
  };
}

export const clubsScreens: ScreenDefinition[] = [
  {
    id: "clubs",
    surfaces: ["admin"],
    viewAny: { permissions: [CLUBS_READ] },
    capabilities: [
      // POST /clubs — clubs.controller.ts @RequirePermissions('clubs:create')
      {
        id: "create",
        kind: "route",
        href: "/dashboard/clubs/new",
        gate: { permissions: [CLUBS_CREATE] },
      },
      {
        id: "bulk_create",
        kind: "route",
        href: "/dashboard/clubs/import",
        gate: { permissions: [CLUBS_CREATE] },
      },
      // PATCH /clubs/:clubId — clubs:update
      { id: "update", kind: "button", gate: { permissions: [CLUBS_UPDATE] } },
      // DELETE /clubs/:clubId — clubs:delete
      { id: "delete", kind: "button", gate: { permissions: [CLUBS_DELETE] } },
      // POST /clubs/:clubId/sections — club_sections:create
      {
        id: "sections.create",
        kind: "button",
        gate: { permissions: [CLUB_SECTIONS_CREATE] },
      },
      // PATCH /clubs/:clubId/sections/:sectionId — club_sections:update
      {
        id: "sections.update",
        kind: "button",
        gate: { permissions: [CLUB_SECTIONS_UPDATE] },
      },
      // POST /clubs/:clubId/sections/:sectionId/roles* and class counselors
      { id: "manage_roles", kind: "button", gate: { permissions: [CLUB_ROLES_ASSIGN] } },
      // DELETE /clubs/:clubId/sections/:sectionId/roles/:assignmentId
      { id: "revoke_roles", kind: "button", gate: { permissions: [CLUB_ROLES_REVOKE] } },
      {
        // POST /clubs/:clubId/sections/:sectionId/director-designation
        // `ALLOWED_DESIGNATION_ROLES` (service, literal) → backend capability.
        id: "designate_director",
        kind: "button",
        gate: capabilityAccess("club_roles.designate_director", [CLUB_ROLES_ASSIGN]),
      },
      {
        // POST /clubs/:clubId/sections/:sectionId/director-succession
        // @RequirePermissions assign+revoke + literal role list (service).
        id: "succeed_director",
        kind: "button",
        gate: capabilityAccess(
          "club_roles.succeed_director",
          [CLUB_ROLES_ASSIGN, CLUB_ROLES_REVOKE],
          { requireAll: true },
        ),
      },
    ],
  },
  {
    id: "annual_continuations",
    // Embedded in club detail (sections tab). Dedicated catalog path so
    // resolvePathEntry('/dashboard/clubs') stays clubs:read.
    path: "/dashboard/clubs/annual-continuations",
    titleKey: "enrollments",
    surfaces: ["admin", "app"],
    viewAny: { permissions: [CLUB_MEMBERS_APPROVE] },
    capabilities: [
      {
        id: "enroll",
        kind: "button",
        gate: { permissions: [CLUB_MEMBERS_APPROVE] },
      },
    ],
  },
  {
    id: "coordination",
    surfaces: ["admin"],
    // coordination.controller.ts:44-55 class-level
    // @RequirePermissions('coordination:manage') + @GlobalRoles matching
    // USER_MANAGEMENT_ROLES (admin/super-admin + lf/union/dia) →
    // `users.manage_in_scope`.
    viewAny: capabilityAccess("users.manage_in_scope", [COORDINATION_MANAGE]),
    // Writes (zones, zone districts, coordinator assignments, backfill) mirror
    // coordination.controller.ts: @ExactGlobalRoles(admin, assistant-admin,
    // super-admin, director-lf, assistant-lf), published as
    // `coordination.manage`. Reads keep the class-level @GlobalRoles, so union
    // and division still view the screen (viewAny above) without writing.
    capabilities: [
      { id: "manage", kind: "button", gate: capabilityAccess("coordination.manage") },
    ],
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

  // Approve / reject: POST requests/transfers|assignments/:id/review needs
  // requests:review. Coordinators and pastors read the list without it.
  {
    ...viewOnlyScreen("requests-transfers", { permissions: [REQUESTS_READ] }),
    capabilities: [
      { id: "review", kind: "button", gate: { permissions: [REQUESTS_REVIEW] } },
    ],
  },
  {
    ...viewOnlyScreen("requests-assignments", { permissions: [REQUESTS_READ] }),
    capabilities: [
      { id: "review", kind: "button", gate: { permissions: [REQUESTS_REVIEW] } },
    ],
  },
  // Two reviewer profiles share the page (see membership-review-mode.ts):
  // club_members:approve reviews everything; consent:verify alone reviews only
  // minors' consent forms (coordinators). Backend: the list, consent-evidence
  // and verify-consent routes are any-of; approve/reject stay approve-only.
  {
    id: "requests-membership",
    surfaces: ["admin"],
    viewAny: { permissions: [CLUB_MEMBERS_APPROVE, CONSENT_VERIFY] },
    capabilities: [
      {
        id: "approve",
        kind: "button",
        gate: { permissions: [CLUB_MEMBERS_APPROVE] },
      },
      {
        id: "verify_consent",
        kind: "button",
        gate: { permissions: [CONSENT_VERIFY, CLUB_MEMBERS_APPROVE] },
      },
    ],
  },

  viewOnlyScreen("validations-investitures", {
    permissions: [VALIDATION_READ],
  }),

  {
    id: "clubs-evidence-folders-templates",
    surfaces: ["admin"],
    // GET /annual-folders/templates needs annual_folder_templates:read;
    // evidence_folders:read alone (coordinators) gets a 403.
    viewAny: { permissions: [ANNUAL_FOLDER_TEMPLATES_READ] },
    capabilities: [
      // DELETE /annual-folders/templates/:templateId (draft only) —
      // annual-folders.controller.ts @RequirePermissions('annual_folder_templates:delete')
      {
        id: "delete_draft",
        kind: "button",
        gate: { permissions: [ANNUAL_FOLDER_TEMPLATES_DELETE] },
      },
      // DELETE /annual-folders/templates/sections/:sectionId — same permission
      {
        id: "delete_section",
        kind: "button",
        gate: { permissions: [ANNUAL_FOLDER_TEMPLATES_DELETE] },
      },
    ],
  },
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

  {
    ...viewOnlyScreen("section-rankings", {
      permissions: [
        SECTION_RANKINGS_READ_CLUB,
        SECTION_RANKINGS_READ_LF,
        SECTION_RANKINGS_READ_UNION,
        SECTION_RANKINGS_READ_DIVISION,
        SECTION_RANKINGS_READ_GLOBAL,
      ],
    }),
    capabilities: [
      {
        // Member breakdown opened from a section's member list. Not a sidebar
        // leaf: without this route the path had no gate and failed closed.
        // GET member-rankings/:enrollmentId/breakdown accepts these reads.
        id: "member_breakdown",
        kind: "route",
        href: "/dashboard/member-rankings",
        gate: {
          permissions: [
            MEMBER_RANKINGS_READ_SECTION,
            MEMBER_RANKINGS_READ_CLUB,
            MEMBER_RANKINGS_READ_LF,
            MEMBER_RANKINGS_READ_UNION,
            MEMBER_RANKINGS_READ_DIVISION,
            MEMBER_RANKINGS_READ_GLOBAL,
          ],
        },
      },
    ],
  },
  viewOnlyScreen("member-of-month", { permissions: [MOM_SUPERVISE] }),

  viewOnlyScreen("reports-list", { permissions: [REPORTS_READ] }, { surfaces: ["admin", "app"] }),
  viewOnlyScreen("reports-supervision", { permissions: [REPORTS_READ] }),
  // Quarterly and annual club reports. quarterly-reports.controller.ts /
  // annual-reports.controller.ts: GET admin/* is reports:read, PATCH / regenerate /
  // finalize / generate are reports:update, GET :id/pdf is reports:download.
  // Admin-only: the app never shows these screens, so the Flutter fixture stays as is.
  reportsPeriodicScreen("reports-quarterly"),
  reportsPeriodicScreen("reports-annual"),

  viewOnlyScreen(
    "year-end",
    catalogEditorAccess([ECCLESIASTICAL_YEARS_UPDATE]),
  ),
];

import {
  CERTIFICATIONS_CERTIFY,
  CERTIFICATIONS_CONFIGURE,
  CERTIFICATIONS_PUBLISH,
  CERTIFICATIONS_REVIEW,
  INVESTITURE_CONFIG_CREATE,
  INVESTITURE_CONFIG_DELETE,
  INVESTITURE_CONFIG_READ,
  INVESTITURE_CONFIG_UPDATE,
  INVESTITURE_MARK_INVESTED,
  INVESTITURE_READ,
  INVESTITURE_VALIDATE,
  USER_CERTIFICATIONS_MANAGE,
  USER_CERTIFICATIONS_READ,
} from "@/lib/auth/permissions";
import { SUPER_ADMIN_ROLE } from "@/lib/auth/roles";

import type { NavAccess, ScreenDefinition } from "../types";
import { roleOnlyAccess } from "./_helpers";

/**
 * GET /investiture/pending — @GlobalRoles('admin', 'coordinator')
 * plus aliases of GlobalRolesGuard. Super-admin is listed because the
 * existing viewAny already included it (evaluator also bypasses it).
 */
const INVESTITURE_QUEUE_ROLES = [
  SUPER_ADMIN_ROLE,
  "admin",
  "assistant-admin",
  "coordinator",
  "zone-coordinator",
  "general-coordinator",
] as const;

/**
 * GET /admin/investiture/config — @GlobalRoles copied at method level
 * (`investiture.controller.ts` L701-710) plus aliases already expanded
 * in the previous viewAny. Do not shrink this list.
 */
const INVESTITURE_CONFIG_ROLES = [
  SUPER_ADMIN_ROLE,
  "admin",
  "assistant-admin",
  "coordinator",
  "zone-coordinator",
  "general-coordinator",
  "director-lf",
  "assistant-lf",
  "director-union",
  "assistant-union",
  "director-dia",
  "assistant-dia",
] as const;

/**
 * POST/PATCH/DELETE /admin/investiture/config — literal `@GlobalRoles`
 * on those methods (`investiture.controller.ts` L769-839).
 */
const INVESTITURE_CONFIG_WRITE_ROLES = [
  "admin",
  "coordinator",
  "director-lf",
  "assistant-lf",
  "director-union",
  "assistant-union",
  "director-dia",
  "assistant-dia",
] as const;

/**
 * `@GlobalRoles('admin', 'coordinator')` on validate / reject / invest /
 * coordinator-approve / bulk (`investiture.controller.ts`).
 */
const INVESTITURE_ADMIN_COORD_ROLES = ["admin", "coordinator"] as const;

/**
 * Class-level `@GlobalRoles` on `AdminCertificateBulkImportsController`
 * (`admin-certificate-bulk-imports.controller.ts` L34-40). SkipPermissions.
 */
const CERTIFICATE_BULK_ROLES = [
  SUPER_ADMIN_ROLE,
  "admin",
  "assistant-admin",
  "director-lf",
  "assistant-lf",
] as const;

function investitureQueueAccess(): NavAccess {
  return {
    permissions: [INVESTITURE_READ],
    roles: [...INVESTITURE_QUEUE_ROLES],
  };
}

function adminCoordValidateGate(): NavAccess {
  return {
    permissions: [INVESTITURE_VALIDATE],
    roles: [...INVESTITURE_ADMIN_COORD_ROLES],
  };
}

export const investitureScreens: ScreenDefinition[] = [
  {
    id: "enrollments",
    surfaces: ["admin"],
    viewAny: investitureQueueAccess(),
    capabilities: [
      // POST /enrollments/:enrollmentId/validate — L603-607
      {
        id: "validate",
        kind: "button",
        gate: adminCoordValidateGate(),
      },
    ],
  },
  {
    id: "certifications-list",
    surfaces: ["admin"],
    viewAny: { permissions: [USER_CERTIFICATIONS_READ] },
    capabilities: [
      // PATCH .../users/:userId/certifications/:id/progress — L251-252
      {
        id: "manage",
        kind: "button",
        gate: { permissions: [USER_CERTIFICATIONS_MANAGE] },
      },
    ],
  },
  {
    id: "certifications-reviews",
    surfaces: ["admin"],
    viewAny: { permissions: [CERTIFICATIONS_REVIEW] },
    capabilities: [
      // POST reviews/requirements/:id/approve and
      // POST reviews/final/:id/approve-closeout-evidence
      {
        id: "approve",
        kind: "button",
        gate: { permissions: [CERTIFICATIONS_REVIEW] },
      },
      // POST .../request-changes (requirement + closeout)
      {
        id: "request_changes",
        kind: "button",
        gate: { permissions: [CERTIFICATIONS_REVIEW] },
      },
      // POST reviews/final/:enrollmentId/certify — L217-218
      {
        id: "certify",
        kind: "button",
        gate: { permissions: [CERTIFICATIONS_CERTIFY] },
      },
    ],
  },
  {
    id: "certificate-bulk-imports",
    surfaces: ["admin"],
    viewAny: roleOnlyAccess(CERTIFICATE_BULK_ROLES),
    capabilities: [
      // POST admin/certificate-bulk-imports/:batchId/approve and .../items/:id/approve
      {
        id: "approve",
        kind: "button",
        gate: roleOnlyAccess(CERTIFICATE_BULK_ROLES),
      },
      // POST .../reject and .../items/:id/reject
      {
        id: "reject",
        kind: "button",
        gate: roleOnlyAccess(CERTIFICATE_BULK_ROLES),
      },
    ],
  },
  {
    id: "investiture-pending",
    surfaces: ["admin"],
    viewAny: investitureQueueAccess(),
    capabilities: [
      // POST /enrollments/:enrollmentId/validate — L603-607
      {
        id: "validate",
        kind: "button",
        gate: adminCoordValidateGate(),
      },
      // POST /enrollments/:enrollmentId/investiture — L635-639
      {
        id: "mark_invested",
        kind: "button",
        gate: {
          permissions: [INVESTITURE_MARK_INVESTED],
          roles: [...INVESTITURE_ADMIN_COORD_ROLES],
        },
      },
    ],
  },
  {
    id: "investiture-pipeline",
    surfaces: ["admin"],
    viewAny: investitureQueueAccess(),
    capabilities: [
      // POST /investiture/enrollments/:id/club-approve — L116-120 (ClubRoles, no @GlobalRoles)
      {
        id: "club_approve",
        kind: "button",
        gate: { permissions: [INVESTITURE_VALIDATE] },
      },
      // POST .../coordinator-approve — L162-166
      {
        id: "coordinator_approve",
        kind: "button",
        gate: adminCoordValidateGate(),
      },
      // POST .../field-approve — L206-210 `@GlobalRoles('admin')`
      {
        id: "field_approve",
        kind: "button",
        gate: { permissions: [INVESTITURE_VALIDATE], roles: ["admin"] },
      },
      // POST .../invest — L250-254
      {
        id: "invest",
        kind: "button",
        gate: {
          permissions: [INVESTITURE_MARK_INVESTED],
          roles: [...INVESTITURE_ADMIN_COORD_ROLES],
        },
      },
      // POST .../reject — L298-302
      {
        id: "reject",
        kind: "button",
        gate: adminCoordValidateGate(),
      },
      // POST .../bulk-approve — L338-342 (validate even when action is invest)
      {
        id: "bulk_approve",
        kind: "button",
        gate: adminCoordValidateGate(),
      },
      // POST .../bulk-reject — L389-393
      {
        id: "bulk_reject",
        kind: "button",
        gate: adminCoordValidateGate(),
      },
    ],
  },
  {
    id: "investiture-config",
    surfaces: ["admin"],
    viewAny: {
      permissions: [INVESTITURE_CONFIG_READ],
      roles: [...INVESTITURE_CONFIG_ROLES],
    },
    capabilities: [
      // POST /admin/investiture/config — L767-779
      {
        id: "create",
        kind: "button",
        gate: {
          permissions: [INVESTITURE_CONFIG_CREATE],
          roles: [...INVESTITURE_CONFIG_WRITE_ROLES],
        },
      },
      // PATCH /admin/investiture/config/:configId — L794-806
      {
        id: "update",
        kind: "button",
        gate: {
          permissions: [INVESTITURE_CONFIG_UPDATE],
          roles: [...INVESTITURE_CONFIG_WRITE_ROLES],
        },
      },
      // DELETE /admin/investiture/config/:configId — L827-839
      {
        id: "delete",
        kind: "button",
        gate: {
          permissions: [INVESTITURE_CONFIG_DELETE],
          roles: [...INVESTITURE_CONFIG_WRITE_ROLES],
        },
      },
    ],
  },
  {
    id: "catalogs-certifications",
    surfaces: ["admin"],
    viewAny: { permissions: [CERTIFICATIONS_CONFIGURE] },
    capabilities: [
      // GET/POST/PATCH /admin/certifications* — L43-138
      {
        id: "configure",
        kind: "button",
        gate: { permissions: [CERTIFICATIONS_CONFIGURE] },
      },
      // POST/DELETE .../publish — L157-174
      {
        id: "publish",
        kind: "button",
        gate: { permissions: [CERTIFICATIONS_PUBLISH] },
      },
    ],
  },
];

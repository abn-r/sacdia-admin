import {
  CERTIFICATIONS_CERTIFY,
  CERTIFICATIONS_CONFIGURE,
  CERTIFICATIONS_PUBLISH,
  CERTIFICATIONS_REVIEW,
  INVESTITURE_AUTHORIZER_ROLES,
  INVESTITURE_FIELD_CONFIG_ROLES,
  INVESTITURE_PASTOR_ASSIGN_ROLES,
  USER_CERTIFICATIONS_MANAGE,
  USER_CERTIFICATIONS_READ,
} from "@/lib/auth/permissions";
import { SUPER_ADMIN_ROLE } from "@/lib/auth/roles";

import type { CapabilityGate, ScreenDefinition } from "../types";
import { roleOnlyAccess } from "./_helpers";

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

/**
 * Investiture-by-authorization screens (`investiture-requests` controller and
 * `classes/*investiture*` controllers). Roles only: the endpoints are
 * `@SkipPermissions` or `@GlobalRoles`.
 *
 * - requests: the service compares `director-lf` / `assistant-lf` literally
 *   (`FIELD_AUTHORIZER_ROLES`) and the pastor comes from the district
 *   assignment, so the lf/union/dia alias table must not widen the gate.
 * - pastors: `DistrictInvestiturePastorService.access()` resolves only Campo
 *   and unión roles; `director-dia` would get a 403.
 * - settings: `@GlobalRoles` with alias expansion; unión and división read,
 *   the API decides who edits (`can_edit`).
 */
const INVESTITURE_REQUESTS_GATE: CapabilityGate = {
  permissions: [],
  roles: [...INVESTITURE_AUTHORIZER_ROLES],
  exactRoles: true,
};

const INVESTITURE_PASTORS_GATE: CapabilityGate = {
  permissions: [],
  roles: [...INVESTITURE_PASTOR_ASSIGN_ROLES],
  exactRoles: true,
};

export const investitureScreens: ScreenDefinition[] = [
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
      // POST admin/certificate-bulk-imports/:batchId/items/:id/approve
      // The batch approve route refuses; each row is decided alone.
      {
        id: "approve",
        kind: "button",
        gate: roleOnlyAccess(CERTIFICATE_BULK_ROLES),
      },
      // POST .../items/:id/reject. The batch reject route refuses.
      {
        id: "reject",
        kind: "button",
        gate: roleOnlyAccess(CERTIFICATE_BULK_ROLES),
      },
    ],
  },
  {
    /**
     * Bandeja institucional GM-02 / GM-03.
     * Exclusive to super-admin: approving here records institutional validation,
     * NOT a class enrollment. enrollment_created is always false.
     * POST /admin/certificate-import-institutional-requests/:id/approve|reject
     */
    id: "institutional-certificate-requests",
    surfaces: ["admin"],
    viewAny: roleOnlyAccess([SUPER_ADMIN_ROLE]),
    capabilities: [
      {
        id: "approve",
        kind: "button",
        gate: roleOnlyAccess([SUPER_ADMIN_ROLE]),
      },
      {
        id: "reject",
        kind: "button",
        gate: roleOnlyAccess([SUPER_ADMIN_ROLE]),
      },
    ],
  },
  {
    /** Authorizer list; `/dashboard/investiture-requests/[requestId]` is covered by prefix. */
    id: "investiture-requests",
    surfaces: ["admin"],
    viewAny: INVESTITURE_REQUESTS_GATE,
    capabilities: [],
  },
  {
    id: "investiture-settings",
    surfaces: ["admin"],
    viewAny: roleOnlyAccess([...INVESTITURE_FIELD_CONFIG_ROLES]),
    capabilities: [],
  },
  {
    id: "investiture-pastors",
    surfaces: ["admin"],
    viewAny: INVESTITURE_PASTORS_GATE,
    capabilities: [],
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

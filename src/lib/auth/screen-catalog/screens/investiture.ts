import {
  CERTIFICATIONS_CERTIFY,
  CERTIFICATIONS_CONFIGURE,
  CERTIFICATIONS_PUBLISH,
  CERTIFICATIONS_REVIEW,
  USER_CERTIFICATIONS_MANAGE,
  USER_CERTIFICATIONS_READ,
} from "@/lib/auth/permissions";

import type { CapabilityGate, ScreenDefinition } from "../types";
import { capabilityAccess } from "./_helpers";

/**
 * `AdminCertificateBulkImportsController` (SkipPermissions, class
 * `@GlobalRoles`). The service only accepts a global or local field reviewer
 * scope; the backend folds both rules into `certificates.review_imports`.
 */
const CERTIFICATE_BULK_GATE: CapabilityGate = capabilityAccess(
  "certificates.review_imports",
);

/** D11 queue: same reviewer rule, published as its own capability. */
const HONOR_PROPOSALS_GATE: CapabilityGate = capabilityAccess(
  "honors.review_instructor_proposals",
);

/**
 * Investiture-by-authorization screens (`investiture-requests` controller and
 * `classes/*investiture*` controllers). The endpoints are `@SkipPermissions`
 * or `@GlobalRoles`, so each screen reads the backend capability that mirrors
 * its service rule (pastor from the district assignment, lf literal match,
 * union/division consult-only for the field window).
 */
const INVESTITURE_REQUESTS_GATE: CapabilityGate = capabilityAccess(
  "investiture.authorize_requests",
);

const INVESTITURE_PASTORS_GATE: CapabilityGate = capabilityAccess(
  "investiture.assign_district_pastors",
);

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
    viewAny: CERTIFICATE_BULK_GATE,
    capabilities: [
      // POST admin/certificate-bulk-imports/:batchId/items/:id/approve
      // The batch approve route refuses; each row is decided alone.
      {
        id: "approve",
        kind: "button",
        gate: CERTIFICATE_BULK_GATE,
      },
      // POST .../items/:id/reject. The batch reject route refuses.
      {
        id: "reject",
        kind: "button",
        gate: CERTIFICATE_BULK_GATE,
      },
    ],
  },
  {
    // D11 queue: same Campo Local reviewer as the certificate import
    // (`AdminHonorInstructorProposalsController`, doc §4.9). SkipPermissions.
    id: "honor-instructor-proposals",
    surfaces: ["admin"],
    viewAny: HONOR_PROPOSALS_GATE,
    capabilities: [
      // POST admin/honor-instructor-proposals/:proposalId/approve
      {
        id: "approve",
        kind: "button",
        gate: HONOR_PROPOSALS_GATE,
      },
      // POST admin/honor-instructor-proposals/:proposalId/reject
      {
        id: "reject",
        kind: "button",
        gate: HONOR_PROPOSALS_GATE,
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
    viewAny: capabilityAccess("institutional_certificates.review"),
    capabilities: [
      {
        id: "approve",
        kind: "button",
        gate: capabilityAccess("institutional_certificates.review"),
      },
      {
        id: "reject",
        kind: "button",
        gate: capabilityAccess("institutional_certificates.review"),
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
    // Field window and percentage: union and division consult, the Campo
    // (and platform admins) edit. The page also reads `can_edit` from the API.
    id: "investiture-settings",
    surfaces: ["admin"],
    viewAny: capabilityAccess("investiture.consult_field_window"),
    capabilities: [
      {
        id: "configure",
        kind: "button",
        gate: capabilityAccess("investiture.configure_field_window"),
      },
    ],
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

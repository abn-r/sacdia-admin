import {
  ROLE_REQUIREMENTS_MANAGE,
  SERVICE_CREDENTIALS_REVIEW,
} from "@/lib/auth/permissions";

import type { ScreenDefinition } from "../types";
import { capabilityAccess } from "./_helpers";

/**
 * Review queue of the counselor «constancia»
 * (`ServiceCredentialsReviewController`): the permission opens the door and the
 * backend capability `service_credentials.review` names who may review; the
 * service narrows the rows to the reviewer's scope.
 */
const REVIEW_GATE = capabilityAccess("service_credentials.review", [
  SERVICE_CREDENTIALS_REVIEW,
]);

export const serviceCredentialsScreens: readonly ScreenDefinition[] = [
  {
    id: "service-credentials-review",
    surfaces: ["admin"],
    viewAny: REVIEW_GATE,
    capabilities: [
      // POST /service-credentials/review/:id/approve
      { id: "approve", kind: "button", gate: REVIEW_GATE },
      // POST /service-credentials/review/:id/reject
      { id: "reject", kind: "button", gate: REVIEW_GATE },
    ],
  },
  {
    // `AdminRoleRequirementsController` (admin / super-admin only).
    id: "role-requirements",
    surfaces: ["admin"],
    viewAny: { permissions: [ROLE_REQUIREMENTS_MANAGE] },
    capabilities: [
      // PATCH /admin/role-requirements/:id
      { id: "update", kind: "button", gate: { permissions: [ROLE_REQUIREMENTS_MANAGE] } },
    ],
  },
];

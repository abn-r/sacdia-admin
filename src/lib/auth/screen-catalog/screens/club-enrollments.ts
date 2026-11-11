import { CLUB_ENROLLMENTS_VALIDATE } from "@/lib/auth/permissions";

import type { ScreenDefinition } from "../types";
import { capabilityAccess } from "./_helpers";

/**
 * Validation queue of club section enrollments
 * (`ClubEnrollmentsValidationController`): the permission opens the door and
 * the backend capability `club_enrollments.validate` names who may decide; the
 * service narrows the rows to the reviewer's scope.
 */
const VALIDATE_GATE = capabilityAccess("club_enrollments.validate", [
  CLUB_ENROLLMENTS_VALIDATE,
]);

export const clubEnrollmentsScreens: readonly ScreenDefinition[] = [
  {
    id: "club-enrollments-review",
    surfaces: ["admin"],
    viewAny: VALIDATE_GATE,
    capabilities: [
      // POST /club-enrollments/:enrollmentId/approve and /reject
      { id: "validate", kind: "button", gate: VALIDATE_GATE },
    ],
  },
];

import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";

/**
 * How the viewer reviews membership requests.
 * - `approve`: club_members:approve. Approve / reject plus consent verification.
 * - `verify-only`: consent:verify without club_members:approve (coordinators).
 *   The backend lists only minors with a pending consent and a current form,
 *   and rejects `approve: true` with MR_APPROVE_PERMISSION_REQUIRED.
 */
export type MembershipReviewMode = "approve" | "verify-only";

const SCREEN_ID = "requests-membership";

/** Null when the viewer may not open the page at all. */
export function resolveMembershipReviewMode(
  user: AuthUser | null | undefined,
): MembershipReviewMode | null {
  if (canCapability(user, SCREEN_ID, "approve")) return "approve";
  if (canViewScreen(user, SCREEN_ID)) return "verify-only";
  return null;
}

import type { AdminGuardianships } from "@/lib/api/admin-users";

/**
 * Whether the guardianships card has anything to show.
 *
 * `guardianships` is `null` when the admin lacks `guardianship:read`
 * (or the transitional `users:read_detail`): then no card is rendered. An
 * empty block (an ordinary adult with no family links) renders nothing either.
 */
export function hasGuardianshipsContent(
  guardianships: AdminGuardianships | null | undefined,
): guardianships is AdminGuardianships {
  return (
    !!guardianships &&
    (guardianships.as_dependent.length > 0 ||
      guardianships.as_guardian.length > 0 ||
      guardianships.dependent_profile !== null)
  );
}

export type MajorityReleaseState = "none" | "notice" | "pending" | "completed" | "frozen";

/**
 * Release-at-majority state of a dependent profile, derived read-only from the
 * admin block. A majority freeze is terminal-until-the-person-returns and is
 * never auto-deleted (ruling R6), so no state here implies deletion.
 */
export function getMajorityReleaseState(
  profile: AdminGuardianships["dependent_profile"],
): MajorityReleaseState {
  if (!profile) return "none";
  if (profile.release_completed_at) return "completed";
  if (profile.frozen_reason === "majority_release") return "frozen";
  if (profile.released_at) return "pending";
  if (profile.majority_notice_sent_at) return "notice";
  return "none";
}

import type { AdminGuardianships } from "@/lib/api/admin-users";

/**
 * Whether the guardianships card has anything to show.
 *
 * `guardianships` is `null` when the admin lacks `legal_representative:read`
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

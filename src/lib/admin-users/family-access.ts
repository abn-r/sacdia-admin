import type { AdminFamilyAccess } from "@/lib/api/admin-users";

/**
 * Whether the family access card has anything to show.
 *
 * `family_access` is `null` when the admin lacks the sensitive
 * `legal_representative` permission: then no card is rendered. An empty block
 * (a user with neither an own login nor linked devices) renders nothing either.
 */
export function hasFamilyAccessContent(
  familyAccess: AdminFamilyAccess | null | undefined,
): familyAccess is AdminFamilyAccess {
  return (
    !!familyAccess &&
    (familyAccess.supervised_login !== null || familyAccess.linked_devices.length > 0)
  );
}

import { MOM_EVALUATE } from "@/lib/auth/permissions";
import { extractPermissions, hasCapability } from "@/lib/auth/permission-utils";
import type { AuthUser } from "@/lib/auth/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Section of the ACTIVE club assignment, the only one the backend guards honour. */
function activeAssignmentSectionId(user: AuthUser): number | null {
  const activeId = user.authorization?.active_assignment?.assignment_id;
  const assignments = user.authorization?.grants?.club_assignments;
  if (typeof activeId !== "string" || !Array.isArray(assignments)) return null;
  for (const raw of assignments) {
    const grant = asRecord(raw);
    if (!grant || grant.assignment_id !== activeId) continue;
    const sectionId = asRecord(grant.section)?.club_section_id;
    return typeof sectionId === "number" ? sectionId : null;
  }
  return null;
}

/**
 * POST /clubs/:clubId/sections/:sectionId/member-of-month/evaluate.
 * Mirrors `assertIsDirector` in sacdia-backend member-of-month.service.ts:
 * besides `mom:evaluate` (controller), the caller must be the director of the
 * ACTIVE club assignment (`club.active_director`) in that exact section. It
 * applies to every caller, super-admin included — a supervisor without a
 * director assignment there gets 403 MOM_FORBIDDEN.
 */
export function canEvaluateMemberOfMonth(
  user: AuthUser | null | undefined,
  sectionId: number,
): boolean {
  if (!user) return false;
  const hasPermission = extractPermissions(user).some(
    (p) => p.trim().toLowerCase() === MOM_EVALUATE,
  );
  if (!hasPermission) return false;
  if (!hasCapability(user, "club.active_director")) return false;
  return activeAssignmentSectionId(user) === sectionId;
}

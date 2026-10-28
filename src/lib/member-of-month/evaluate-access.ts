import { MOM_EVALUATE } from "@/lib/auth/permissions";
import { extractPermissions } from "@/lib/auth/permission-utils";
import type { AuthUser } from "@/lib/auth/types";

/**
 * Club roles that may run POST /clubs/:clubId/sections/:sectionId/member-of-month/evaluate.
 * Mirrors `assertIsDirector` in sacdia-backend/src/member-of-month/member-of-month.service.ts:
 * besides `mom:evaluate` (controller), the caller must hold an ACTIVE club role of one of
 * these names in that exact section. It applies to every caller, super-admin included —
 * a supervisor (admin / director-lf) without a director assignment there gets
 * 403 MOM_FORBIDDEN.
 */
export const MOM_EVALUATOR_CLUB_ROLES = ["director", "sub-director", "directora"] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function canEvaluateMemberOfMonth(
  user: AuthUser | null | undefined,
  sectionId: number,
): boolean {
  if (!user) return false;
  const hasPermission = extractPermissions(user).some(
    (p) => p.trim().toLowerCase() === MOM_EVALUATE,
  );
  if (!hasPermission) return false;

  const assignments = user.authorization?.grants?.club_assignments;
  if (!Array.isArray(assignments)) return false;

  return assignments.some((raw) => {
    const grant = asRecord(raw);
    if (!grant) return false;
    const roleName =
      typeof grant.role_name === "string" ? grant.role_name.trim().toLowerCase() : "";
    if (!(MOM_EVALUATOR_CLUB_ROLES as readonly string[]).includes(roleName)) return false;
    return asRecord(grant.section)?.club_section_id === sectionId;
  });
}

import { isPastorOnlyUser, PASTOR_LANDING_PATH } from "@/lib/auth/roles";
import {
  evaluateAccess,
  resolveAccessForPath,
  subjectFromUser,
  type CapabilityGate,
} from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";

/**
 * Page gate for a dashboard URL, read from the screen catalog:
 * exact route capability → exact screen path → longest prefix. Unmapped URLs
 * return `undefined` and callers fail closed.
 */
export function resolveNavAccessForPath(pathname: string): CapabilityGate | undefined {
  return resolveAccessForPath(pathname);
}

export function canAccessDashboardPath(
  user: AuthUser | null | undefined,
  pathname: string,
): boolean {
  const subject = subjectFromUser(user);
  if (subject.isSuperAdmin) {
    return true;
  }

  const path = (pathname.split("?")[0] ?? pathname).trim();
  if (!path) {
    return false;
  }

  // A pastor-only user opens just the authorization screen. `/dashboard` stays
  // reachable so the home page can redirect them there.
  if (isPastorOnlyUser(user)) {
    return (
      path === "/dashboard" ||
      path === PASTOR_LANDING_PATH ||
      path.startsWith(`${PASTOR_LANDING_PATH}/`)
    );
  }

  const access = resolveNavAccessForPath(path);
  if (!access) {
    return false;
  }

  return evaluateAccess(subject, access);
}

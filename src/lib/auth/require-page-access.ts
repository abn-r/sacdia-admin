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

  const access = resolveNavAccessForPath(path);
  if (!access) {
    return false;
  }

  return evaluateAccess(subject, access);
}

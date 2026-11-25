/**
 * Usage of a role: how many people hold it. Comes from the backend endpoint
 * `GET /admin/rbac/roles/:id/usage` (backend B3). The payload shape is not
 * final, so parsing lives here and tolerates the likely variants.
 */

export type RoleUsage =
  /** The endpoint answered with a count. */
  | { available: true; usersCount: number }
  /** The endpoint does not exist yet (404/405/501) or answered something unreadable. */
  | { available: false };

const COUNT_KEYS = ["users_count", "usersCount", "user_count", "count", "total"] as const;

function readCount(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of COUNT_KEYS) {
    const n = record[key];
    if (typeof n === "number" && Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return null;
}

/** Accepts `{ users_count }`, the `{ status, data: { users_count } }` envelope, or a bare number. */
export function parseRoleUsage(body: unknown): RoleUsage {
  if (typeof body === "number" && Number.isFinite(body) && body >= 0) {
    return { available: true, usersCount: Math.floor(body) };
  }
  const direct = readCount(body);
  if (direct !== null) return { available: true, usersCount: direct };
  if (body && typeof body === "object" && "data" in body) {
    const nested = (body as { data: unknown }).data;
    if (typeof nested === "number" && Number.isFinite(nested) && nested >= 0) {
      return { available: true, usersCount: Math.floor(nested) };
    }
    const n = readCount(nested);
    if (n !== null) return { available: true, usersCount: n };
  }
  return { available: false };
}

/** Statuses that mean "this endpoint is not there": fall back to try-and-read-the-error. */
export function isUsageEndpointMissing(status: number): boolean {
  return status === 404 || status === 405 || status === 501;
}

/** Users list filtered by role (the list reads `?role=<role_name>`). */
export function roleUsersHref(roleName: string): string {
  return `/dashboard/users?role=${encodeURIComponent(roleName)}`;
}

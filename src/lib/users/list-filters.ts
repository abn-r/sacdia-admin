import type { AdminUsersQuery } from "@/lib/api/admin-users";

/** True when the list query narrows the result (search, role or status). */
export function hasActiveUsersFilters(
  query: Pick<AdminUsersQuery, "search" | "role" | "active" | "unionId" | "localFieldId">,
): boolean {
  return Boolean(
    query.search?.trim() ||
      query.role ||
      typeof query.active === "boolean" ||
      query.unionId ||
      query.localFieldId,
  );
}

/** Query-string keys the list filters own; clearing removes exactly these. */
export const USERS_FILTER_PARAMS = ["search", "role", "active", "page"] as const;

export function clearUsersFilterParams(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const key of USERS_FILTER_PARAMS) next.delete(key);
  return next;
}

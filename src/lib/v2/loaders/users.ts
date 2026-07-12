import type { AdminUsersQuery } from "@/lib/api/admin-users";
import { listAdminUsers } from "@/lib/api/admin-users";
import type { AuthUser } from "@/lib/auth/types";

export function parseUsersSearchParams(
  raw: Record<string, string | string[] | undefined>,
): AdminUsersQuery {
  const getString = (key: string) => {
    const v = raw[key];
    return typeof v === "string" ? v : undefined;
  };
  const getNumber = (key: string) => {
    const v = getString(key);
    return v ? Number(v) : undefined;
  };

  return {
    search: getString("search"),
    role: getString("role"),
    active:
      getString("active") === "true"
        ? true
        : getString("active") === "false"
          ? false
          : undefined,
    unionId: getNumber("unionId"),
    localFieldId: getNumber("localFieldId"),
    page: getNumber("page") || 1,
    limit: getNumber("limit") || 20,
  };
}

export async function loadUsersList(query: AdminUsersQuery, currentUser: AuthUser) {
  const result = await listAdminUsers(query);
  return { result, currentUser, query };
}

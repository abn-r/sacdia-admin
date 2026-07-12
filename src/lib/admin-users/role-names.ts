import type { AdminUser } from "@/lib/api/admin-users";

export function extractAdminUserRoleNames(
  user: Pick<AdminUser, "roles" | "users_roles">,
): string[] {
  const roles: string[] = [];

  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      if (typeof role === "string" && role.trim().length > 0) {
        roles.push(role.trim());
      }
    }
  }

  if (Array.isArray(user.users_roles)) {
    for (const ur of user.users_roles) {
      const roleName = ur.roles?.role_name;
      if (typeof roleName === "string" && roleName.trim().length > 0) {
        roles.push(roleName.trim());
      }
    }
  }

  return [...new Set(roles)];
}

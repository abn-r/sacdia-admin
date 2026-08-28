import { SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import type { Role } from "@/lib/rbac/types";

export type CopyRolePermissionsIssue =
  | "same_role"
  | "source_protected"
  | "target_protected"
  | "source_missing"
  | "target_missing";

export function isProtectedRole(role: Pick<Role, "role_name"> | null | undefined): boolean {
  return role?.role_name === SUPER_ADMIN_ROLE;
}

export function activePermissionIds(role: Role | null | undefined): string[] {
  if (!role?.role_permissions) {
    return [];
  }

  return role.role_permissions
    .filter((assignment) => assignment.active !== false)
    .map((assignment) => assignment.permission_id)
    .filter(Boolean);
}

export function validateCopyRolePermissions(
  source: Role | null | undefined,
  target: Role | null | undefined,
): CopyRolePermissionsIssue | null {
  if (!source) {
    return "source_missing";
  }
  if (!target) {
    return "target_missing";
  }
  if (source.role_id === target.role_id) {
    return "same_role";
  }
  if (isProtectedRole(source)) {
    return "source_protected";
  }
  if (isProtectedRole(target)) {
    return "target_protected";
  }
  return null;
}

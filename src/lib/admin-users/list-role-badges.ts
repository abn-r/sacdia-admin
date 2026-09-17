import type { AdminUser } from "@/lib/api/admin-users";
import type { RoleTranslator } from "@/lib/auth/role-labels";

const CLUB_ROLE_RANK: Record<string, number> = {
  director: 0,
  "deputy-director": 1,
  secretary: 2,
  "secretary-treasurer": 3,
  treasurer: 4,
  counselor: 5,
  instructor: 6,
  member: 9,
};

export type UserListRoleBadge = {
  key: string;
  label: string;
};

function rankRole(roleName: string): number {
  return CLUB_ROLE_RANK[roleName.trim().toLowerCase()] ?? 8;
}

function uniqueRoleNames(
  user: Pick<AdminUser, "roles" | "users_roles" | "club_assignments">,
): string[] {
  const seen = new Set<string>();
  const roles: string[] = [];

  function add(raw: string | null | undefined) {
    const role = raw?.trim();
    if (!role) {
      return;
    }
    const key = role.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    roles.push(role);
  }

  if (user.roles) {
    for (const role of user.roles) {
      add(role);
    }
  }
  if (user.users_roles) {
    for (const ur of user.users_roles) {
      add(ur.roles?.role_name);
    }
  }
  if (Array.isArray(user.club_assignments)) {
    for (const assignment of user.club_assignments) {
      add(assignment?.role_name);
    }
  }

  return roles.sort((a, b) => {
    const rank = rankRole(a) - rankRole(b);
    if (rank !== 0) {
      return rank;
    }
    return a.localeCompare(b, "es", { sensitivity: "base" });
  });
}

/**
 * Roles column: cargo only (Director, Secretario, Miembro).
 * Same cargo in several sections collapses to one badge.
 */
export function toUserListRoleBadges(
  user: Pick<AdminUser, "roles" | "users_roles" | "club_assignments">,
  translateRole: RoleTranslator,
): UserListRoleBadge[] {
  return uniqueRoleNames(user).map((role) => ({
    key: role.toLowerCase(),
    label: translateRole(role) || role,
  }));
}

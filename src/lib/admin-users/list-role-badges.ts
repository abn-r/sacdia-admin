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

export type CompactClubAssignment = {
  assignment_id?: string | null;
  role_name?: string | null;
  section_name?: string | null;
  club_name?: string | null;
};

function rankClubRole(roleName: string): number {
  return CLUB_ROLE_RANK[roleName.trim().toLowerCase()] ?? 8;
}

function asAssignment(value: unknown): CompactClubAssignment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const row = value as CompactClubAssignment;
  const roleName = row.role_name?.trim();
  if (!roleName) {
    return null;
  }
  return {
    assignment_id: row.assignment_id ?? null,
    role_name: roleName,
    section_name: row.section_name?.trim() || null,
    club_name: row.club_name?.trim() || null,
  };
}

export function normalizeListClubAssignments(
  value: unknown,
): CompactClubAssignment[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows = value
    .map(asAssignment)
    .filter((row): row is CompactClubAssignment => row !== null);

  return rows.sort((a, b) => {
    const rank = rankClubRole(a.role_name ?? "") - rankClubRole(b.role_name ?? "");
    if (rank !== 0) {
      return rank;
    }
    return (a.section_name ?? "").localeCompare(b.section_name ?? "", "es", {
      sensitivity: "base",
    });
  });
}

function uniqueRoleNames(user: Pick<AdminUser, "roles" | "users_roles">): string[] {
  const roles: string[] = [];
  if (user.roles) {
    roles.push(...user.roles);
  }
  if (user.users_roles) {
    for (const ur of user.users_roles) {
      if (ur.roles?.role_name) {
        roles.push(ur.roles.role_name);
      }
    }
  }
  return [...new Set(roles.filter((role) => role.trim().length > 0))];
}

function formatClubBadge(
  assignment: CompactClubAssignment,
  translateRole: RoleTranslator,
): string {
  const roleLabel = translateRole(assignment.role_name) || assignment.role_name || "";
  if (assignment.section_name) {
    return `${roleLabel} · ${assignment.section_name}`;
  }
  return roleLabel;
}

/**
 * Roles column: one badge per club-section cargo (Director · Aventureros),
 * then leftover global roles. Falls back to unique slugs if the list
 * payload has no `club_assignments`.
 */
export function toUserListRoleBadges(
  user: Pick<AdminUser, "roles" | "users_roles" | "club_assignments">,
  translateRole: RoleTranslator,
): UserListRoleBadge[] {
  const assignments = normalizeListClubAssignments(user.club_assignments);
  if (assignments.length > 0) {
    const badges: UserListRoleBadge[] = assignments.map((assignment, index) => ({
      key:
        assignment.assignment_id ??
        `${assignment.role_name}:${assignment.section_name ?? index}`,
      label: formatClubBadge(assignment, translateRole),
    }));

    const clubSlugs = new Set(
      assignments.map((assignment) => assignment.role_name?.toLowerCase()),
    );
    for (const role of uniqueRoleNames(user)) {
      if (clubSlugs.has(role.toLowerCase())) {
        continue;
      }
      badges.push({ key: `global:${role}`, label: translateRole(role) || role });
    }
    return badges;
  }

  return uniqueRoleNames(user).map((role) => ({
    key: role,
    label: translateRole(role) || role,
  }));
}

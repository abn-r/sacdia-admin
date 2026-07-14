import type { UserRole } from "@/lib/rbac/types";

export function isGlobalCategoryRole(role: { role_category?: string | null }): boolean {
  return role.role_category?.trim().toUpperCase() === "GLOBAL";
}

const ADMINISTRATIVE_ROLE_NAMES = new Set([
  "super-admin",
  "admin",
  "assistant-admin",
  "director-dia",
  "assistant-dia",
  "director-union",
  "assistant-union",
  "director-lf",
  "assistant-lf",
]);

const OPERATIONAL_ROLE_NAMES = new Set([
  "coordinator",
  "zone-coordinator",
  "general-coordinator",
  "pastor",
  "instructor",
]);

export type ClubSectionRoleRow = {
  id: string;
  clubName: string | null;
  sectionName: string | null;
  roleName: string | null;
};

export type UserRoleBuckets = {
  global: UserRole[];
  administrative: UserRole[];
  operational: UserRole[];
  clubSections: ClubSectionRoleRow[];
};

function normalizeRoleName(roleName: string): string {
  return roleName.trim().toLowerCase();
}

export function bucketUserRoles(
  userRoles: UserRole[],
  clubAssignments: ClubSectionRoleRow[],
): UserRoleBuckets {
  const global: UserRole[] = [];
  const administrative: UserRole[] = [];
  const operational: UserRole[] = [];

  for (const entry of userRoles) {
    if (!isGlobalCategoryRole(entry.roles)) continue;
    const roleName = normalizeRoleName(entry.roles.role_name);
    if (ADMINISTRATIVE_ROLE_NAMES.has(roleName)) {
      administrative.push(entry);
      continue;
    }
    if (OPERATIONAL_ROLE_NAMES.has(roleName)) {
      operational.push(entry);
      continue;
    }
    global.push(entry);
  }

  return {
    global,
    administrative,
    operational,
    clubSections: clubAssignments,
  };
}

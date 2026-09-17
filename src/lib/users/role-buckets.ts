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

export type SystemRoleGroups = {
  administrative: UserRole[];
  operational: UserRole[];
  other: UserRole[];
};

function normalizeRoleName(roleName: string): string {
  return roleName.trim().toLowerCase();
}

export function groupSystemRoles(userRoles: UserRole[]): SystemRoleGroups {
  const administrative: UserRole[] = [];
  const operational: UserRole[] = [];
  const other: UserRole[] = [];

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
    other.push(entry);
  }

  return { administrative, operational, other };
}

export function flattenSystemRoleGroups(groups: SystemRoleGroups): UserRole[] {
  return [...groups.administrative, ...groups.operational, ...groups.other];
}

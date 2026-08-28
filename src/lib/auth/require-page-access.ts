import { extractPermissions } from "@/lib/auth/permission-utils";
import {
  MATERIALS_CONFIGURE,
  MATERIALS_READ,
  PERMISSIONS_ASSIGN,
  PERMISSIONS_READ,
  ROLES_READ,
} from "@/lib/auth/permissions";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";
import type { NavAccess } from "@/navigation/sidebar/nav-access";
import { getNavItemAccess } from "@/navigation/sidebar/sidebar-item-access";
import {
  sidebarItems,
  type NavGroup,
  type NavSubItem,
} from "@/navigation/sidebar/sidebar-items";

type NavUrlEntry = {
  id: string;
  url: string;
  access: NavAccess | undefined;
};

/**
 * Dashboard URLs that are not sidebar leaves. Longest prefix wins after
 * the sidebar map. Unmapped URLs fail closed.
 */
const EXTRA_PATH_ACCESS: Array<{ prefix: string; access: NavAccess }> = [
  {
    prefix: "/dashboard/materials/request",
    access: { permissions: [MATERIALS_READ] },
  },
  {
    prefix: "/dashboard/materials/config",
    access: { permissions: [MATERIALS_CONFIGURE] },
  },
  {
    prefix: "/dashboard/materials",
    access: { permissions: [MATERIALS_READ] },
  },
  {
    prefix: "/dashboard/rbac/user-permissions",
    access: {
      permissions: [PERMISSIONS_ASSIGN],
      roles: [SUPER_ADMIN_ROLE],
    },
  },
  {
    prefix: "/dashboard/coming-soon",
    access: { permissions: ["dashboard:read"] },
  },
  {
    prefix: "/dashboard/configuration",
    access: { permissions: [PERMISSIONS_READ, ROLES_READ] },
  },
  {
    prefix: "/dashboard/v2",
    access: { permissions: ["dashboard:read"] },
  },
  {
    prefix: "/dashboard/annual-folders",
    access: {
      permissions: [
        "annual_folders:evaluate",
        "rankings:read",
        "annual_folder_templates:read",
      ],
    },
  },
];

function walkSubItems(items: NavSubItem[], out: NavUrlEntry[]) {
  for (const item of items) {
    if (item.url) {
      out.push({
        id: item.id,
        url: item.url,
        access: getNavItemAccess(item),
      });
    }
    if (item.subItems?.length) {
      walkSubItems(item.subItems, out);
    }
  }
}

export function collectNavUrlEntries(
  groups: NavGroup[] = sidebarItems,
): NavUrlEntry[] {
  const out: NavUrlEntry[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      if ("url" in item && item.url) {
        out.push({
          id: item.id,
          url: item.url,
          access: getNavItemAccess(item),
        });
      }
      if ("subItems" in item && item.subItems) {
        walkSubItems(item.subItems, out);
      }
    }
  }

  return out;
}

function matchExtraPathAccess(path: string): NavAccess | undefined {
  const match = EXTRA_PATH_ACCESS.filter(
    (entry) => path === entry.prefix || path.startsWith(`${entry.prefix}/`),
  ).sort((left, right) => right.prefix.length - left.prefix.length)[0];
  return match?.access;
}

export function resolveNavAccessForPath(
  pathname: string,
  groups: NavGroup[] = sidebarItems,
): NavAccess | undefined {
  const path = (pathname.split("?")[0] ?? pathname).trim();
  if (!path) {
    return undefined;
  }

  const entries = collectNavUrlEntries(groups);
  const exact = entries.find((entry) => entry.url === path);
  if (exact) {
    return exact.access;
  }

  const prefix = entries
    .filter(
      (entry) =>
        entry.url !== "/dashboard" && path.startsWith(`${entry.url}/`),
    )
    .sort((left, right) => right.url.length - left.url.length)[0];

  if (prefix) {
    return prefix.access;
  }

  return matchExtraPathAccess(path);
}

export function canAccessDashboardPath(
  user: AuthUser | null | undefined,
  pathname: string,
): boolean {
  const roles = new Set(extractRoles(user));
  if (roles.has(SUPER_ADMIN_ROLE)) {
    return true;
  }

  const path = (pathname.split("?")[0] ?? pathname).trim();
  if (!path) {
    return false;
  }

  const access = resolveNavAccessForPath(pathname);
  if (!access) {
    return false;
  }

  const permissions = access.permissions ?? [];
  const requiredRoles = access.roles ?? [];
  if (permissions.length === 0 && requiredRoles.length === 0) {
    return true;
  }

  const granted = new Set(
    extractPermissions(user).map((permission) => permission.toLowerCase()),
  );
  const permissionsOk =
    permissions.length === 0 ||
    (access.requireAll
      ? permissions.every((permission) =>
          granted.has(permission.toLowerCase()),
        )
      : permissions.some((permission) =>
          granted.has(permission.toLowerCase()),
        ));
  const rolesOk =
    requiredRoles.length === 0 ||
    requiredRoles.some((role) => roles.has(role));

  return permissionsOk && rolesOk;
}

import { extractPermissions } from "@/lib/auth/permission-utils";
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

  return prefix?.access;
}

export function canAccessDashboardPath(
  user: AuthUser | null | undefined,
  pathname: string,
): boolean {
  const roles = new Set(extractRoles(user));
  if (roles.has(SUPER_ADMIN_ROLE)) {
    return true;
  }

  const access = resolveNavAccessForPath(pathname);
  if (!access) {
    return true;
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

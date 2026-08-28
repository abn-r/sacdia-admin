import type { NavAccess } from "./nav-access";
import { getNavItemAccess } from "./sidebar-item-access";
import type { NavGroup, NavMainItem, NavSubItem } from "./sidebar-items";

export type SidebarPermissionChecker = {
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isSuperAdmin: boolean;
};

function isItemAllowed(
  item: { id: string; access?: NavAccess },
  checker: SidebarPermissionChecker,
): boolean {
  if (checker.isSuperAdmin) {
    return true;
  }

  const access = getNavItemAccess(item);
  if (!access) {
    return true;
  }

  const permissions = access.permissions ?? [];
  const roles = access.roles ?? [];

  if (permissions.length === 0 && roles.length === 0) {
    return true;
  }

  const permissionsOk =
    permissions.length === 0 ||
    (access.requireAll
      ? checker.canAll(permissions)
      : checker.canAny(permissions));

  const rolesOk = roles.length === 0 || checker.hasAnyRole(roles);

  return permissionsOk && rolesOk;
}

function filterSubItems(
  subItems: NavSubItem[],
  checker: SidebarPermissionChecker,
): NavSubItem[] {
  const filtered: NavSubItem[] = [];

  for (const sub of subItems) {
    if (sub.subItems?.length) {
      const children = filterSubItems(sub.subItems, checker);
      if (children.length > 0) {
        filtered.push({ ...sub, subItems: children });
      }
      continue;
    }

    if (!sub.url) {
      continue;
    }

    if (isItemAllowed(sub, checker)) {
      filtered.push(sub);
    }
  }

  return filtered;
}

function filterMainItem(
  item: NavMainItem,
  checker: SidebarPermissionChecker,
): NavMainItem | null {
  if ("subItems" in item && item.subItems) {
    const subItems = filterSubItems(item.subItems, checker);
    if (subItems.length === 0) {
      return null;
    }
    return { ...item, subItems };
  }

  if (!item.url || !isItemAllowed(item, checker)) {
    return null;
  }

  return item;
}

export function filterSidebarItems(
  groups: NavGroup[],
  checker: SidebarPermissionChecker,
): NavGroup[] {
  return groups
    .map((group) => {
      const items = group.items
        .map((item) => filterMainItem(item, checker))
        .filter((item): item is NavMainItem => item !== null);

      if (items.length === 0) {
        return null;
      }

      return { ...group, items };
    })
    .filter((group): group is NavGroup => group !== null);
}

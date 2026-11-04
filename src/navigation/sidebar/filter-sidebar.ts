import { evaluateAccess, type AccessSubject } from "@/lib/auth/screen-catalog";

import { getNavItemAccess } from "./sidebar-item-access";
import type { NavGroup, NavMainItem, NavSubItem } from "./sidebar-items";

/**
 * Sidebar visibility uses the same subject and evaluator as page gates
 * (`canAccessDashboardPath`) and in-page verbs (`canCapability`).
 */
export type SidebarAccessChecker = AccessSubject & {
  /** Pastor-only user: only the authorization list is shown (decision 2026-10-08). */
  pastorOnly?: boolean;
};

const PASTOR_SIDEBAR_ITEM_ID = "investiture-requests";

function isItemAllowed(
  item: { id: string },
  checker: SidebarAccessChecker,
): boolean {
  if (checker.isSuperAdmin) {
    return true;
  }

  if (checker.pastorOnly && item.id !== PASTOR_SIDEBAR_ITEM_ID) {
    return false;
  }

  const access = getNavItemAccess(item);
  // Unmapped leaves stay hidden. Matches route fail-closed in canAccessDashboardPath.
  if (!access) {
    return false;
  }

  return evaluateAccess(checker, access);
}

function filterSubItems(
  subItems: NavSubItem[],
  checker: SidebarAccessChecker,
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
  checker: SidebarAccessChecker,
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
  checker: SidebarAccessChecker,
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

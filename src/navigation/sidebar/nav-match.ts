import type { NavGroup, NavMainLinkItem, NavSubItem } from "@/navigation/sidebar/sidebar-items";

type ActiveMatch = NavSubItem["activeMatch"] | NavMainLinkItem["activeMatch"];

export function matchesNavPath(path: string, url: string, activeMatch?: ActiveMatch): boolean {
  switch (activeMatch) {
    case "prefix":
      return path === url || path.startsWith(`${url}/`);
    case "clubs-list":
      return (
        path === url ||
        (/^\/dashboard\/clubs\/[^/]+$/.test(path) &&
          !path.startsWith("/dashboard/clubs/validations") &&
          !path.startsWith("/dashboard/clubs/evidence-folders"))
      );
    case "evidence-folders":
      return path === url || path.startsWith(`${url}/`);
    case "exact":
    default:
      return path === url;
  }
}

function collectLeaves(
  items: readonly { url?: string; activeMatch?: ActiveMatch; subItems?: readonly NavSubItem[] }[],
  out: { url: string; activeMatch?: ActiveMatch }[],
) {
  for (const item of items) {
    if (item.subItems?.length) {
      collectLeaves(item.subItems, out);
    } else if (item.url) {
      out.push({ url: item.url, activeMatch: item.activeMatch });
    }
  }
}

/**
 * Length of the longest URL among all nav leaves matching `path`, or -1.
 * When several leaves match (e.g. "Clubes" by prefix and "Actividades" under
 * /dashboard/clubs/activities), only the most specific one is active.
 */
export function getBestMatchLength(path: string, groups: readonly NavGroup[]): number {
  const leaves: { url: string; activeMatch?: ActiveMatch }[] = [];
  for (const group of groups) collectLeaves(group.items, leaves);

  let best = -1;
  for (const leaf of leaves) {
    if (matchesNavPath(path, leaf.url, leaf.activeMatch) && leaf.url.length > best) {
      best = leaf.url.length;
    }
  }
  return best;
}

export function isLeafActive(
  path: string,
  leaf: { url?: string; activeMatch?: ActiveMatch },
  bestLength: number,
): boolean {
  if (!leaf.url) return false;
  return matchesNavPath(path, leaf.url, leaf.activeMatch) && leaf.url.length === bestLength;
}

export function isSubItemActiveFor(path: string, subItem: NavSubItem, bestLength: number): boolean {
  if (subItem.subItems?.length) {
    return subItem.subItems.some((child) => isSubItemActiveFor(path, child, bestLength));
  }
  return isLeafActive(path, subItem, bestLength);
}

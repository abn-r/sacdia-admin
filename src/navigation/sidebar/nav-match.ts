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
          !path.startsWith("/dashboard/clubs/activities") &&
          !path.startsWith("/dashboard/clubs/evidence-folders"))
      );
    case "evidence-folders":
      return path === url || path.startsWith(`${url}/`);
    case "exact":
    default:
      return path === url;
  }
}

type MatchLeaf = { url?: string; activeMatch?: ActiveMatch; matchPaths?: readonly string[] };

/**
 * Length of the URL that makes `leaf` match `path` (its own url, or one of its
 * `matchPaths` prefixes), or -1. The longest wins, so a page reached from an
 * index (`/dashboard/catalogs/honors`) activates the index entry only when no
 * more specific leaf claims it.
 */
function leafMatchLength(path: string, leaf: MatchLeaf): number {
  if (!leaf.url) return -1;
  let best = matchesNavPath(path, leaf.url, leaf.activeMatch) ? leaf.url.length : -1;
  for (const extra of leaf.matchPaths ?? []) {
    if (matchesNavPath(path, extra, "prefix") && extra.length > best) best = extra.length;
  }
  return best;
}

function collectLeaves(
  items: readonly (MatchLeaf & { subItems?: readonly NavSubItem[] })[],
  out: MatchLeaf[],
) {
  for (const item of items) {
    if (item.subItems?.length) {
      collectLeaves(item.subItems, out);
    } else if (item.url) {
      out.push(item);
    }
  }
}

/**
 * Length of the longest URL among all nav leaves matching `path`, or -1.
 * When several leaves match (e.g. "Clubes" by prefix and "Actividades" under
 * /dashboard/clubs/activities), only the most specific one is active.
 */
export function getBestMatchLength(path: string, groups: readonly NavGroup[]): number {
  const leaves: MatchLeaf[] = [];
  for (const group of groups) collectLeaves(group.items, leaves);

  let best = -1;
  for (const leaf of leaves) {
    best = Math.max(best, leafMatchLength(path, leaf));
  }
  return best;
}

export function isLeafActive(
  path: string,
  leaf: MatchLeaf,
  bestLength: number,
): boolean {
  return leafMatchLength(path, leaf) === bestLength && bestLength >= 0;
}

export function isSubItemActiveFor(path: string, subItem: NavSubItem, bestLength: number): boolean {
  if (subItem.subItems?.length) {
    return subItem.subItems.some((child) => isSubItemActiveFor(path, child, bestLength));
  }
  return isLeafActive(path, subItem, bestLength);
}

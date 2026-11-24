import type { NavGroup, NavMainItem, NavSubItem } from "./sidebar-items";

/** Cookie holding the user's open/closed choice per sidebar group: `{ [groupId]: boolean }`. */
export const SIDEBAR_GROUPS_COOKIE = "sidebar_groups";
const SIDEBAR_GROUPS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Groups ("Por atender", "Clubes y miembros") that start open when the user has no stored choice. */
export const DEFAULT_OPEN_GROUP_IDS: ReadonlySet<number> = new Set([1, 2]);

/** With this many top-level items or fewer (e.g. pastor-only), groups are not collapsible. */
export const MAX_ITEMS_WITHOUT_GROUP_TOGGLE = 6;

export type GroupOpenState = Readonly<Record<string, boolean>>;

export function defaultGroupOpen(groupId: number): boolean {
  return DEFAULT_OPEN_GROUP_IDS.has(groupId);
}

/** Whether labelled groups get a toggle: only when the user sees enough items for it to matter. */
export function groupsAreToggleable(groups: readonly NavGroup[]): boolean {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  return total > MAX_ITEMS_WITHOUT_GROUP_TOGGLE;
}

/** Tolerant parser: anything that is not a `{ id: boolean }` map yields only its valid entries. */
export function parseGroupOpenState(raw: string | null | undefined): GroupOpenState {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean") result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export function readGroupOpenStateCookie(cookieString: string): GroupOpenState {
  for (const part of cookieString.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SIDEBAR_GROUPS_COOKIE) {
      try {
        return parseGroupOpenState(decodeURIComponent(rest.join("=")));
      } catch {
        return {};
      }
    }
  }
  return {};
}

export function serializeGroupOpenStateCookie(state: GroupOpenState): string {
  return `${SIDEBAR_GROUPS_COOKIE}=${encodeURIComponent(JSON.stringify(state))}; path=/; max-age=${SIDEBAR_GROUPS_COOKIE_MAX_AGE}; samesite=lax`;
}

function sumSubItemCounts(
  subItems: readonly NavSubItem[],
  counts: Readonly<Record<string, number>>,
): number {
  return subItems.reduce(
    (total, sub) =>
      total + (sub.subItems?.length ? sumSubItemCounts(sub.subItems, counts) : (counts[sub.id] ?? 0)),
    0,
  );
}

export function sumItemCounts(
  item: NavMainItem,
  counts: Readonly<Record<string, number>>,
): number {
  return item.subItems?.length ? sumSubItemCounts(item.subItems, counts) : (counts[item.id] ?? 0);
}

/** Sum of the queue counts of every item in the group (shown on the header while it is closed). */
export function sumGroupCounts(
  group: NavGroup,
  counts: Readonly<Record<string, number>>,
): number {
  return group.items.reduce((total, item) => total + sumItemCounts(item, counts), 0);
}

export { sumSubItemCounts };

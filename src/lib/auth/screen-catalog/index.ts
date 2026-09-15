import type { AuthUser } from "@/lib/auth/types";
import {
  sidebarItems,
  type NavGroup,
  type NavSubItem,
} from "@/navigation/sidebar/sidebar-items";

import { evaluateAccess, subjectFromUser } from "./evaluate";
import { adminSystemScreens } from "./screens/admin-system";
import { appScreens } from "./screens/app";
import { campamentosScreens } from "./screens/campamentos";
import { catalogsDomainScreens } from "./screens/catalogs-domain";
import { catalogsGeographyScreens } from "./screens/catalogs-geography";
import { clubsScreens } from "./screens/clubs";
import { homeScreens } from "./screens/home";
import { investitureScreens } from "./screens/investiture";
import { notificationsScreens } from "./screens/notifications";
import { operationsScreens } from "./screens/operations";
import { usersScreen } from "./screens/users";
import type {
  AccessSubject,
  NavAccess,
  ScreenCapability,
  ScreenDefinition,
} from "./types";

export { evaluateAccess, subjectFromUser } from "./evaluate";
export { expandRequiredRoles, GLOBAL_ROLE_ALIASES } from "./role-aliases";
export { PAYMENT_ORDERS_PAGE_PERMISSIONS } from "./screens/operations";
export { camporeeScreenId } from "./screens/campamentos";
export { USER_MANAGEMENT_ROLES } from "./screens/_helpers";
export type * from "./types";

/**
 * Every admin screen, one entry per sidebar leaf (plus hubs). Order is the
 * matrix display order. Add new families as their own file under
 * `./screens/` and register them here.
 */
export const SCREEN_CATALOG: readonly ScreenDefinition[] = [
  ...homeScreens,
  usersScreen,
  ...clubsScreens,
  ...investitureScreens,
  ...operationsScreens,
  ...campamentosScreens,
  ...notificationsScreens,
  ...catalogsGeographyScreens,
  ...catalogsDomainScreens,
  ...adminSystemScreens,
  ...appScreens,
];

const SCREEN_BY_ID: ReadonlyMap<string, ScreenDefinition> = new Map(
  SCREEN_CATALOG.map((screen) => [screen.id, screen]),
);

// ─── Sidebar url lookup ──────────────────────────────────────────────────────

type SidebarLeaf = { id: string; url: string; title: string };

function walkSubItems(items: NavSubItem[], out: SidebarLeaf[]) {
  for (const item of items) {
    if (item.url) {
      out.push({ id: item.id, url: item.url, title: item.title });
    }
    if (item.subItems?.length) {
      walkSubItems(item.subItems, out);
    }
  }
}

export function collectSidebarLeaves(groups: NavGroup[] = sidebarItems): SidebarLeaf[] {
  const out: SidebarLeaf[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if ("url" in item && item.url) {
        out.push({ id: item.id, url: item.url, title: item.title });
      }
      if ("subItems" in item && item.subItems) {
        walkSubItems(item.subItems, out);
      }
    }
  }
  return out;
}

const SIDEBAR_LEAF_BY_ID: ReadonlyMap<string, SidebarLeaf> = new Map(
  collectSidebarLeaves().map((leaf) => [leaf.id, leaf]),
);

// ─── Lookups ─────────────────────────────────────────────────────────────────

export function getScreen(screenId: string): ScreenDefinition | undefined {
  return SCREEN_BY_ID.get(screenId);
}

export function getCapability(
  screenId: string,
  capabilityId: string,
): ScreenCapability | undefined {
  return getScreen(screenId)?.capabilities.find((cap) => cap.id === capabilityId);
}

/** Sidebar / page-entry gate for a nav item id. `undefined` = unmapped (fail closed). */
export function getScreenViewAny(screenId: string): NavAccess | undefined {
  return getScreen(screenId)?.viewAny;
}

export function resolveScreenPath(screen: ScreenDefinition): string | undefined {
  return screen.path ?? SIDEBAR_LEAF_BY_ID.get(screen.id)?.url;
}

/** Sidebar title (already the fallback when `titleKey` is missing). */
export function getScreenFallbackTitle(screen: ScreenDefinition): string {
  return SIDEBAR_LEAF_BY_ID.get(screen.id)?.title ?? screen.id;
}

/** All API keys behind a screen: viewAny + every capability gate. */
export function bundleKeys(screen: ScreenDefinition): string[] {
  const keys = new Set<string>(screen.viewAny.permissions ?? []);
  for (const capability of screen.capabilities) {
    for (const key of capability.gate.permissions ?? []) {
      keys.add(key);
    }
  }
  return Array.from(keys);
}

// ─── Path → gate ─────────────────────────────────────────────────────────────

type PathEntry = {
  href: string;
  access: NavAccess;
  screenId: string;
  capabilityId?: string;
};

function buildPathEntries(): PathEntry[] {
  const entries: PathEntry[] = [];
  for (const screen of SCREEN_CATALOG) {
    const path = resolveScreenPath(screen);
    if (path) {
      entries.push({ href: path, access: screen.viewAny, screenId: screen.id });
    }
    for (const capability of screen.capabilities) {
      if (capability.kind === "route" && capability.href) {
        entries.push({
          href: capability.href,
          access: capability.gate,
          screenId: screen.id,
          capabilityId: capability.id,
        });
      }
    }
  }
  return entries;
}

const PATH_ENTRIES: readonly PathEntry[] = buildPathEntries();

function normalizePath(pathname: string): string {
  return (pathname.split("?")[0] ?? pathname).trim();
}

/**
 * Resolution order:
 *   1. exact route capability href
 *   2. exact screen path
 *   3. longest prefix among screen paths and route hrefs (`/dashboard` never
 *      acts as a prefix)
 *   4. undefined → callers fail closed
 */
export function resolvePathEntry(pathname: string): PathEntry | undefined {
  const path = normalizePath(pathname);
  if (!path) {
    return undefined;
  }

  const exactRoute = PATH_ENTRIES.find(
    (entry) => entry.capabilityId && entry.href === path,
  );
  if (exactRoute) {
    return exactRoute;
  }

  const exactScreen = PATH_ENTRIES.find(
    (entry) => !entry.capabilityId && entry.href === path,
  );
  if (exactScreen) {
    return exactScreen;
  }

  return PATH_ENTRIES.filter(
    (entry) => entry.href !== "/dashboard" && path.startsWith(`${entry.href}/`),
  ).sort((left, right) => right.href.length - left.href.length)[0];
}

export function resolveAccessForPath(pathname: string): NavAccess | undefined {
  return resolvePathEntry(pathname)?.access;
}

// ─── Evaluators ──────────────────────────────────────────────────────────────

type SubjectLike = AccessSubject | AuthUser | null | undefined;

function toSubject(subject: SubjectLike): AccessSubject {
  if (
    subject &&
    typeof subject === "object" &&
    "permissions" in subject &&
    subject.permissions instanceof Set &&
    "roles" in subject &&
    subject.roles instanceof Set
  ) {
    return subject as AccessSubject;
  }
  return subjectFromUser(subject as AuthUser | null | undefined);
}

/** Can the subject enter the screen (sidebar item / page)? Unknown screen = false. */
export function canViewScreen(subject: SubjectLike, screenId: string): boolean {
  const screen = getScreen(screenId);
  if (!screen) {
    return false;
  }
  return evaluateAccess(toSubject(subject), screen.viewAny);
}

/**
 * Can the subject use a verb inside a screen? Unknown capability = false.
 * Verbs never imply entry: the caller decides whether to also require
 * `canViewScreen` (buttons inside the screen already sit behind it).
 */
export function canCapability(
  subject: SubjectLike,
  screenId: string,
  capabilityId: string,
): boolean {
  const capability = getCapability(screenId, capabilityId);
  if (!capability) {
    return false;
  }
  return evaluateAccess(toSubject(subject), capability.gate);
}

// ─── Grouping for RBAC surfaces ──────────────────────────────────────────────

export const OTHER_SCREEN_GROUP_ID = "__other__";

export type ScreenKeyGroup<T> = {
  screenId: string;
  screen: ScreenDefinition | null;
  /** API-declared roles on `viewAny`; shown as a hint in the matrix. */
  requiredRoles: string[];
  items: T[];
};

/**
 * Groups permission-like items by the first screen whose bundle contains the
 * key, preserving catalog order. Keys outside every bundle go to a trailing
 * "other" group so enforcement never disappears from the UI.
 */
export function groupByScreen<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
): ScreenKeyGroup<T>[] {
  const keyToScreen = new Map<string, ScreenDefinition>();
  for (const screen of SCREEN_CATALOG) {
    for (const key of bundleKeys(screen)) {
      if (!keyToScreen.has(key)) {
        keyToScreen.set(key, screen);
      }
    }
  }

  const buckets = new Map<string, T[]>();
  const other: T[] = [];
  for (const item of items) {
    const screen = keyToScreen.get(keyOf(item).toLowerCase());
    if (!screen) {
      other.push(item);
      continue;
    }
    const bucket = buckets.get(screen.id) ?? [];
    bucket.push(item);
    buckets.set(screen.id, bucket);
  }

  const groups: ScreenKeyGroup<T>[] = [];
  for (const screen of SCREEN_CATALOG) {
    const bucket = buckets.get(screen.id);
    if (bucket && bucket.length > 0) {
      groups.push({
        screenId: screen.id,
        screen,
        requiredRoles: screen.viewAny.roles ?? [],
        items: bucket,
      });
    }
  }
  if (other.length > 0) {
    groups.push({
      screenId: OTHER_SCREEN_GROUP_ID,
      screen: null,
      requiredRoles: [],
      items: other,
    });
  }
  return groups;
}

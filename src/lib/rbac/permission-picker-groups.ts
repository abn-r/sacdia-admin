import {
  bundleKeys,
  OTHER_SCREEN_GROUP_ID,
  SCREEN_CATALOG,
  type ScreenDefinition,
  type ScreenSurface,
} from "@/lib/auth/screen-catalog";
import type { Permission } from "@/lib/rbac/types";

export const PICKER_SURFACE_FILTERS = ["all", "admin", "app", "shared"] as const;
export type PickerSurfaceFilter = (typeof PICKER_SURFACE_FILTERS)[number];

export const PICKER_BUCKETS = [
  "view",
  "routes",
  "actions",
  "sensitive",
  "destructive",
] as const;
export type PickerBucketId = (typeof PICKER_BUCKETS)[number];

/** Group header toggles these. Sensitive + destructive stay explicit. */
export const SAFE_PICKER_BUCKETS: readonly PickerBucketId[] = [
  "view",
  "routes",
  "actions",
];

const DESTRUCTIVE_KEYWORDS = ["delete", "destroy", "purge", "remove"];
const SENSITIVE_PREFIXES = [
  "health:",
  "emergency_contacts:",
  "legal_representative:",
  "post_registration:",
] as const;

const KEY_TO_SCREENS: ReadonlyMap<string, readonly ScreenDefinition[]> =
  buildKeyToScreens();

function buildKeyToScreens(): ReadonlyMap<string, readonly ScreenDefinition[]> {
  const map = new Map<string, ScreenDefinition[]>();
  for (const screen of SCREEN_CATALOG) {
    for (const key of bundleKeys(screen)) {
      const normalized = key.toLowerCase();
      const list = map.get(normalized);
      if (list) {
        if (!list.some((item) => item.id === screen.id)) {
          list.push(screen);
        }
      } else {
        map.set(normalized, [screen]);
      }
    }
  }
  return map;
}

export function isDestructivePermission(name: string): boolean {
  return DESTRUCTIVE_KEYWORDS.some((keyword) =>
    name.toLowerCase().includes(keyword),
  );
}

export function isSensitivePermission(name: string): boolean {
  const lower = name.toLowerCase();
  return SENSITIVE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function screensForPermissionKey(name: string): readonly ScreenDefinition[] {
  return KEY_TO_SCREENS.get(name.toLowerCase()) ?? [];
}

export function surfacesForPermissionKey(name: string): ScreenSurface[] {
  const surfaces = new Set<ScreenSurface>();
  for (const screen of screensForPermissionKey(name)) {
    for (const surface of screen.surfaces) {
      surfaces.add(surface);
    }
  }
  return (["admin", "app"] as const).filter((surface) => surfaces.has(surface));
}

export function permissionMatchesSurfaceFilter(
  name: string,
  filter: PickerSurfaceFilter,
): boolean {
  if (filter === "all") return true;
  const surfaces = surfacesForPermissionKey(name);
  if (filter === "shared") {
    return surfaces.includes("admin") && surfaces.includes("app");
  }
  if (surfaces.length === 0) {
    return false;
  }
  return surfaces.includes(filter);
}

function displayScreenForFilter(
  screens: readonly ScreenDefinition[],
  filter: PickerSurfaceFilter,
): ScreenDefinition | null {
  if (screens.length === 0) return null;
  if (filter === "app") {
    return screens.find((screen) => screen.surfaces.includes("app")) ?? screens[0]!;
  }
  if (filter === "admin") {
    return (
      screens.find((screen) => screen.surfaces.includes("admin")) ?? screens[0]!
    );
  }
  return screens[0]!;
}

export function pickerScreenIdForKey(
  name: string,
  filter: PickerSurfaceFilter = "all",
): string {
  const screen = displayScreenForFilter(screensForPermissionKey(name), filter);
  return screen?.id ?? OTHER_SCREEN_GROUP_ID;
}

export function classifyPickerBucket(
  name: string,
  screen: ScreenDefinition | null,
): PickerBucketId {
  if (isDestructivePermission(name)) return "destructive";
  if (isSensitivePermission(name)) return "sensitive";
  if (!screen) return "actions";

  const lower = name.toLowerCase();
  const inViewAny = (screen.viewAny.permissions ?? []).some(
    (permission) => permission.toLowerCase() === lower,
  );
  if (inViewAny) return "view";

  const capabilities = screen.capabilities.filter((capability) =>
    (capability.gate.permissions ?? []).some(
      (permission) => permission.toLowerCase() === lower,
    ),
  );
  if (capabilities.some((capability) => capability.kind === "route")) {
    return "routes";
  }
  return "actions";
}

export type PickerPermissionRow = {
  permission: Permission;
  surfaces: ScreenSurface[];
  bucket: PickerBucketId;
};

export type PickerBucketGroup = {
  id: PickerBucketId;
  items: PickerPermissionRow[];
};

export type PickerScreenGroup = {
  screenId: string;
  screen: ScreenDefinition | null;
  requiredRoles: string[];
  items: PickerPermissionRow[];
  buckets: PickerBucketGroup[];
};

function emptyPermission(): Pick<
  Permission,
  "description" | "active" | "created_at" | "modified_at"
> {
  return {
    description: null,
    active: true,
    created_at: "",
    modified_at: "",
  };
}

export function buildPickerGroups(
  permissions: readonly Permission[],
  filter: PickerSurfaceFilter,
): PickerScreenGroup[] {
  const bucketsByScreen = new Map<string, PickerPermissionRow[]>();
  const other: PickerPermissionRow[] = [];

  for (const permission of permissions) {
    if (!permissionMatchesSurfaceFilter(permission.permission_name, filter)) {
      continue;
    }
    const screens = screensForPermissionKey(permission.permission_name);
    const screen = displayScreenForFilter(screens, filter);
    const surfaces = surfacesForPermissionKey(permission.permission_name);
    const row: PickerPermissionRow = {
      permission,
      surfaces,
      bucket: classifyPickerBucket(permission.permission_name, screen),
    };
    if (!screen) {
      other.push(row);
      continue;
    }
    const list = bucketsByScreen.get(screen.id) ?? [];
    list.push(row);
    bucketsByScreen.set(screen.id, list);
  }

  const groups: PickerScreenGroup[] = [];
  for (const screen of SCREEN_CATALOG) {
    const items = bucketsByScreen.get(screen.id);
    if (!items?.length) continue;
    groups.push(toScreenGroup(screen.id, screen, items));
  }
  if (other.length > 0) {
    groups.push(toScreenGroup(OTHER_SCREEN_GROUP_ID, null, other));
  }
  return groups;
}

function toScreenGroup(
  screenId: string,
  screen: ScreenDefinition | null,
  items: PickerPermissionRow[],
): PickerScreenGroup {
  const byBucket = new Map<PickerBucketId, PickerPermissionRow[]>();
  for (const item of items) {
    const list = byBucket.get(item.bucket) ?? [];
    list.push(item);
    byBucket.set(item.bucket, list);
  }
  const buckets: PickerBucketGroup[] = [];
  for (const id of PICKER_BUCKETS) {
    const bucketItems = byBucket.get(id);
    if (bucketItems?.length) {
      buckets.push({ id, items: bucketItems });
    }
  }
  return {
    screenId,
    screen,
    requiredRoles: screen?.viewAny.roles ?? [],
    items,
    buckets,
  };
}

export function safeItemsInGroup(group: PickerScreenGroup): PickerPermissionRow[] {
  return group.items.filter((item) =>
    SAFE_PICKER_BUCKETS.includes(item.bucket),
  );
}

/** Test helper: build a permission row without hitting the API. */
export function permissionStub(
  permissionId: string,
  permissionName: string,
): Permission {
  return {
    permission_id: permissionId,
    permission_name: permissionName,
    ...emptyPermission(),
  };
}

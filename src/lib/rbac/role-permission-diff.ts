import { isDestructivePermission } from "@/lib/rbac/permission-picker-groups";
import type { Role } from "@/lib/rbac/types";

/** Active permissions of a role as `permission_id -> permission_name`. */
export function activePermissionMap(role: Role | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const assignment of role?.role_permissions ?? []) {
    if (assignment.active === false || !assignment.permission_id) continue;
    map.set(assignment.permission_id, assignment.permissions?.permission_name ?? assignment.permission_id);
  }
  return map;
}

export type PermissionDiff = {
  /** Permissions the target has now. */
  before: number;
  /** Permissions the target will have after the replacement. */
  after: number;
  gained: number;
  lost: number;
  /** Of the gained ones, how many are delete-type permissions. */
  gainedDestructive: number;
  lostDestructive: number;
};

/** What the target gains and loses when its permissions are replaced by the source's. */
export function diffPermissionMaps(
  source: ReadonlyMap<string, string>,
  target: ReadonlyMap<string, string>,
): PermissionDiff {
  let gained = 0;
  let gainedDestructive = 0;
  for (const [id, name] of source) {
    if (target.has(id)) continue;
    gained += 1;
    if (isDestructivePermission(name)) gainedDestructive += 1;
  }
  let lost = 0;
  let lostDestructive = 0;
  for (const [id, name] of target) {
    if (source.has(id)) continue;
    lost += 1;
    if (isDestructivePermission(name)) lostDestructive += 1;
  }
  return {
    before: target.size,
    after: source.size,
    gained,
    lost,
    gainedDestructive,
    lostDestructive,
  };
}

export function diffRolePermissions(
  source: Role | null | undefined,
  target: Role | null | undefined,
): PermissionDiff {
  return diffPermissionMaps(activePermissionMap(source), activePermissionMap(target));
}

export function isEmptyDiff(diff: PermissionDiff): boolean {
  return diff.gained === 0 && diff.lost === 0;
}

/** Number of checkboxes that differ between the saved set and the working set. */
export function countPermissionChanges(
  saved: ReadonlySet<string>,
  current: ReadonlySet<string>,
): number {
  let changes = 0;
  for (const id of current) if (!saved.has(id)) changes += 1;
  for (const id of saved) if (!current.has(id)) changes += 1;
  return changes;
}

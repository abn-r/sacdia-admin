import { describe, expect, it } from "vitest";
import {
  activePermissionMap,
  countPermissionChanges,
  diffPermissionMaps,
  diffRolePermissions,
  isEmptyDiff,
} from "./role-permission-diff";
import type { Role } from "./types";

function role(id: string, perms: Array<[string, string, boolean?]>): Role {
  return {
    role_id: id,
    role_name: `rol-${id}`,
    role_category: "CLUB",
    description: null,
    active: true,
    role_permissions: perms.map(([permissionId, name, active], i) => ({
      role_permission_id: `${id}-${i}`,
      role_id: id,
      permission_id: permissionId,
      active: active ?? true,
      permissions: { permission_id: permissionId, permission_name: name, description: null },
    })),
  };
}

describe("diffPermissionMaps", () => {
  it("counts what the target gains and loses, with the delete-type ones", () => {
    const source = new Map([
      ["1", "clubs:read"],
      ["2", "clubs:delete"],
      ["3", "users:read"],
    ]);
    const target = new Map([
      ["1", "clubs:read"],
      ["4", "finances:delete"],
      ["5", "finances:read"],
    ]);
    expect(diffPermissionMaps(source, target)).toEqual({
      before: 3,
      after: 3,
      gained: 2,
      lost: 2,
      gainedDestructive: 1,
      lostDestructive: 1,
    });
  });

  it("reports an empty diff when both sets are equal", () => {
    const same = new Map([["1", "clubs:read"]]);
    expect(isEmptyDiff(diffPermissionMaps(same, new Map(same)))).toBe(true);
  });
});

describe("diffRolePermissions", () => {
  it("ignores inactive assignments", () => {
    const source = role("a", [
      ["1", "clubs:read"],
      ["2", "clubs:delete", false],
    ]);
    const target = role("b", [["3", "users:read"]]);
    expect(activePermissionMap(source).size).toBe(1);
    expect(diffRolePermissions(source, target)).toMatchObject({
      before: 1,
      after: 1,
      gained: 1,
      lost: 1,
      gainedDestructive: 0,
    });
  });

  it("matches the approved example: target grows and gains delete permissions", () => {
    const source = role("a", [
      ["1", "clubs:read"],
      ["2", "clubs:delete"],
      ["3", "members:delete"],
      ["4", "members:remove"],
    ]);
    const target = role("b", [["1", "clubs:read"]]);
    const diff = diffRolePermissions(source, target);
    expect(diff).toMatchObject({ before: 1, after: 4, gained: 3, lost: 0, gainedDestructive: 3 });
  });

  it("treats a missing role as empty", () => {
    expect(diffRolePermissions(null, role("b", [["1", "x:read"]]))).toMatchObject({
      before: 1,
      after: 0,
      lost: 1,
    });
  });
});

describe("countPermissionChanges", () => {
  it("counts additions and removals against the saved set", () => {
    expect(countPermissionChanges(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(0);
    expect(countPermissionChanges(new Set(["a", "b"]), new Set(["a", "c", "d"]))).toBe(3);
    expect(countPermissionChanges(new Set(), new Set(["a"]))).toBe(1);
  });

  it("returns to zero when a change is undone", () => {
    const saved = new Set(["a"]);
    const working = new Set(saved);
    working.add("b");
    working.delete("b");
    expect(countPermissionChanges(saved, working)).toBe(0);
  });
});

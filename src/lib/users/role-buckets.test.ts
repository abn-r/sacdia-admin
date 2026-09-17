import { describe, expect, it } from "vitest";
import type { UserRole } from "@/lib/rbac/types";
import {
  flattenSystemRoleGroups,
  groupSystemRoles,
  isGlobalCategoryRole,
} from "./role-buckets";

function makeUserRole(roleName: string, category: string): UserRole {
  return {
    user_role_id: `ur-${roleName}`,
    user_id: "user-1",
    role_id: `role-${roleName}`,
    active: true,
    created_at: null,
    modified_at: null,
    roles: {
      role_id: `role-${roleName}`,
      role_name: roleName,
      role_category: category,
      active: true,
    },
  };
}

describe("isGlobalCategoryRole", () => {
  it("matches GLOBAL regardless of case or surrounding space", () => {
    expect(isGlobalCategoryRole({ role_category: "GLOBAL" })).toBe(true);
    expect(isGlobalCategoryRole({ role_category: " global " })).toBe(true);
    expect(isGlobalCategoryRole({ role_category: "CLUB" })).toBe(false);
    expect(isGlobalCategoryRole({ role_category: null })).toBe(false);
  });
});

describe("groupSystemRoles", () => {
  it("splits GLOBAL users_roles into administrative, operational, and other", () => {
    const groups = groupSystemRoles([
      makeUserRole("admin", "GLOBAL"),
      makeUserRole("pastor", "GLOBAL"),
      makeUserRole("user", "GLOBAL"),
      makeUserRole("director", "CLUB"),
    ]);

    expect(groups.administrative.map((entry) => entry.roles.role_name)).toEqual(["admin"]);
    expect(groups.operational.map((entry) => entry.roles.role_name)).toEqual(["pastor"]);
    expect(groups.other.map((entry) => entry.roles.role_name)).toEqual(["user"]);
  });

  it("does not keep a leftover global bucket for residual system roles", () => {
    const groups = groupSystemRoles([makeUserRole("user", "GLOBAL")]);

    expect(groups).toEqual({
      administrative: [],
      operational: [],
      other: [expect.objectContaining({ roles: expect.objectContaining({ role_name: "user" }) })],
    });
    expect(groups).not.toHaveProperty("global");
  });

  it("ignores club_role_assignments-style CLUB rows even if mixed into users_roles", () => {
    const groups = groupSystemRoles([
      makeUserRole("Director", "CLUB"),
      makeUserRole("member", "CLUB"),
    ]);

    expect(groups).toEqual({
      administrative: [],
      operational: [],
      other: [],
    });
  });

  it("normalizes role names before matching admin and operational sets", () => {
    const groups = groupSystemRoles([
      makeUserRole(" Super-Admin ", "GLOBAL"),
      makeUserRole("ZONE-COORDINATOR", "GLOBAL"),
    ]);

    expect(groups.administrative).toHaveLength(1);
    expect(groups.operational).toHaveLength(1);
    expect(groups.other).toHaveLength(0);
  });
});

describe("flattenSystemRoleGroups", () => {
  it("concatenates groups in administrative, operational, other order", () => {
    const flat = flattenSystemRoleGroups(
      groupSystemRoles([
        makeUserRole("user", "GLOBAL"),
        makeUserRole("admin", "GLOBAL"),
        makeUserRole("pastor", "GLOBAL"),
      ]),
    );

    expect(flat.map((entry) => entry.roles.role_name)).toEqual(["admin", "pastor", "user"]);
  });
});

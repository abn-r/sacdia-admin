import { describe, expect, it } from "vitest";
import type { AuthUser } from "./types";

import { extractRoles, isSuperAdminUser } from "./roles";

function userWithGrants(
  globalRoles: { role_name?: string; role?: string; name?: string; key?: string }[],
  options: {
    clubAssignments?: Record<string, unknown>[];
    activeAssignmentId?: string;
  } = {},
): AuthUser {
  return {
    id: "u2",
    email: "u@test.com",
    authorization: {
      grants: {
        global_roles: globalRoles,
        ...(options.clubAssignments ? { club_assignments: options.clubAssignments } : {}),
      },
      ...(options.activeAssignmentId
        ? { active_assignment: { assignment_id: options.activeAssignmentId } }
        : {}),
    },
  };
}

describe("extractRoles", () => {
  it("returns empty array for null / undefined / users without authorization", () => {
    expect(extractRoles(null)).toEqual([]);
    expect(extractRoles(undefined)).toEqual([]);
    expect(extractRoles({ id: "u3", email: "u@test.com" })).toEqual([]);
    expect(extractRoles({} as AuthUser)).toEqual([]);
  });

  it("ignores the flat `roles` array: only the authorization grants count", () => {
    const user: AuthUser = { id: "u1", email: "u@test.com", roles: ["admin"] };
    expect(extractRoles(user)).toEqual([]);
  });

  it("reads global roles from role_name / role / name / key, normalized and deduped", () => {
    const user = userWithGrants([
      { role_name: " Super-Admin " },
      { role: "admin" },
      { name: "ADMIN" },
      { key: "coordinator" },
    ]);
    expect(extractRoles(user)).toEqual(["super-admin", "admin", "coordinator"]);
  });

  it("adds only the club role of the ACTIVE assignment, never every club", () => {
    const user = userWithGrants([{ role_name: "pastor" }], {
      activeAssignmentId: "a-2",
      clubAssignments: [
        { assignment_id: "a-1", role_name: "director" },
        { assignment_id: "a-2", role_name: "secretary" },
      ],
    });
    const roles = extractRoles(user);
    expect(roles).toContain("pastor");
    expect(roles).toContain("secretary");
    expect(roles).not.toContain("director");
  });

  it("adds no club role without an active assignment", () => {
    const user = userWithGrants([{ role_name: "pastor" }], {
      clubAssignments: [{ assignment_id: "a-1", role_name: "director" }],
    });
    expect(extractRoles(user)).toEqual(["pastor"]);
  });

  it("ignores non-string role values without throwing", () => {
    const user = userWithGrants([{ role_name: 42 as unknown as string }, { role: "admin" }]);
    expect(extractRoles(user)).toEqual(["admin"]);
  });

  it("unwraps a {status, data} envelope before reading grants", () => {
    const user = {
      status: "success",
      data: userWithGrants([{ role_name: "super-admin" }]),
    } as unknown as AuthUser;
    expect(extractRoles(user)).toEqual(["super-admin"]);
    expect(isSuperAdminUser(user)).toBe(true);
  });
});

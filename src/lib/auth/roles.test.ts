import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "./types";

// roles.ts reads NEXT_PUBLIC_RBAC_LEGACY_FALLBACK at module evaluation time,
// so we must stub the env BEFORE importing and reload the module per suite.

function buildUserWithRoles(roles: string[]): AuthUser {
  return { id: "u1", email: "u@test.com", roles };
}

function buildUserWithAuthorizationGrants(globalRoles: { role_name?: string; role?: string; name?: string; key?: string }[]): AuthUser {
  return {
    id: "u2",
    email: "u@test.com",
    authorization: {
      grants: {
        global_roles: globalRoles,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Suite A — legacy fallback DISABLED (default production mode)
// ---------------------------------------------------------------------------
describe("hasAdminRole — legacy fallback OFF", () => {
  let roles: typeof import("./roles");

  beforeAll(async () => {
    vi.stubEnv("NEXT_PUBLIC_RBAC_LEGACY_FALLBACK", "false");
    vi.resetModules();
    roles = await import("./roles");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when user.roles contains 'admin'", () => {
    const user = buildUserWithRoles(["admin"]);
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("returns true when user.roles contains 'super-admin'", () => {
    const user = buildUserWithRoles(["super-admin"]);
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("returns true when user.roles contains 'coordinator'", () => {
    const user = buildUserWithRoles(["coordinator"]);
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("returns true when user.roles contains 'zone-coordinator'", () => {
    const user = buildUserWithRoles(["zone-coordinator"]);
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("returns true when user.roles contains 'pastor'", () => {
    const user = buildUserWithRoles(["pastor"]);
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("returns true when user.roles contains 'director-lf'", () => {
    const user = buildUserWithRoles(["director-lf"]);
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("returns false when user.roles contains only 'member'", () => {
    const user = buildUserWithRoles(["member"]);
    expect(roles.hasAdminRole(user)).toBe(false);
  });

  it("returns false when user.roles is empty", () => {
    const user = buildUserWithRoles([]);
    expect(roles.hasAdminRole(user)).toBe(false);
  });

  it("returns false for null user", () => {
    expect(roles.hasAdminRole(null)).toBe(false);
  });

  it("returns false for undefined user", () => {
    expect(roles.hasAdminRole(undefined)).toBe(false);
  });

  it("returns false for user with no roles or authorization", () => {
    const user: AuthUser = { id: "u3", email: "u@test.com" };
    expect(roles.hasAdminRole(user)).toBe(false);
  });

  it("returns false for an empty object cast as AuthUser", () => {
    const user = {} as AuthUser;
    expect(roles.hasAdminRole(user)).toBe(false);
  });

  it("is case-insensitive: 'ADMIN' normalizes to 'admin' and returns true", () => {
    const user = buildUserWithRoles(["ADMIN"]);
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("trims whitespace from role strings", () => {
    const user = buildUserWithRoles([" super-admin "]);
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("returns true when matching role comes from authorization.grants.global_roles[].role_name", () => {
    const user = buildUserWithAuthorizationGrants([{ role_name: "super-admin" }]);
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("returns true when matching role comes from authorization.grants.global_roles[].role", () => {
    const user = buildUserWithAuthorizationGrants([{ role: "admin" }]);
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("returns false when authorization.grants.global_roles contains only unknown roles", () => {
    const user = buildUserWithAuthorizationGrants([{ role_name: "member" }]);
    expect(roles.hasAdminRole(user)).toBe(false);
  });

  it("ignores non-string role values in the roles array without throwing", () => {
    const user = { id: "u4", email: "u@test.com", roles: [42, null, "admin"] } as unknown as AuthUser;
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("unwraps response-envelope structure {status, data} before checking roles", () => {
    const user = {
      id: "envelope",
      email: "e@test.com",
      status: "success",
      data: {
        id: "inner",
        email: "inner@test.com",
        roles: ["super-admin"],
      },
    } as unknown as AuthUser;
    expect(roles.hasAdminRole(user)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite B — legacy fallback ENABLED
// ---------------------------------------------------------------------------
describe("hasAdminRole — legacy fallback ON (top-level role field)", () => {
  let roles: typeof import("./roles");

  beforeAll(async () => {
    vi.stubEnv("NEXT_PUBLIC_RBAC_LEGACY_FALLBACK", "true");
    vi.resetModules();
    roles = await import("./roles");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when top-level role field is 'admin' (legacy path)", () => {
    // No canonical roles → falls through to legacy extractor
    const user: AuthUser = { id: "l1", email: "l@test.com", role: "admin" };
    expect(roles.hasAdminRole(user)).toBe(true);
  });

  it("returns false when top-level role field is 'member' (legacy path)", () => {
    const user: AuthUser = { id: "l2", email: "l@test.com", role: "member" };
    expect(roles.hasAdminRole(user)).toBe(false);
  });

  it("returns true when metadata.roles contains an allowed role (legacy path)", () => {
    const user: AuthUser = {
      id: "l3",
      email: "l@test.com",
      metadata: { roles: ["coordinator"] },
    };
    expect(roles.hasAdminRole(user)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite C — extractRoles direct tests
// ---------------------------------------------------------------------------
describe("extractRoles", () => {
  let roles: typeof import("./roles");

  beforeAll(async () => {
    vi.stubEnv("NEXT_PUBLIC_RBAC_LEGACY_FALLBACK", "false");
    vi.resetModules();
    roles = await import("./roles");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns empty array for null", () => {
    expect(roles.extractRoles(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(roles.extractRoles(undefined)).toEqual([]);
  });

  it("returns normalized roles from user.roles array", () => {
    const user = buildUserWithRoles(["Admin", " coordinator "]);
    expect(roles.extractRoles(user)).toEqual(["admin", "coordinator"]);
  });

  it("deduplicates roles that appear in both canonical paths", () => {
    const user: AuthUser = {
      id: "u5",
      email: "u@test.com",
      roles: ["super-admin"],
      authorization: {
        grants: {
          global_roles: [{ role_name: "super-admin" }],
        },
      },
    };
    const extracted = roles.extractRoles(user);
    expect(extracted.filter((r) => r === "super-admin").length).toBe(1);
  });

  it("extracts roles from club_assignments as well as global_roles", () => {
    const user: AuthUser = {
      id: "u6",
      email: "u@test.com",
      authorization: {
        grants: {
          global_roles: [{ role_name: "admin" }],
          club_assignments: [{ role: "coordinator" }],
        },
      },
    };
    const extracted = roles.extractRoles(user);
    expect(extracted).toContain("admin");
    expect(extracted).toContain("coordinator");
  });
});

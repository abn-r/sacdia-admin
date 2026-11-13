import { describe, expect, it } from "vitest";
import type { AuthUser } from "./types";

import {
  canAccessAdminPanel,
  canManageAdministrativeCompletion,
  canReadSensitiveUserFamily,
  canUpdateSensitiveUserFamily,
  canViewAdministrativeCompletion,
  extractCapabilities,
  extractPermissions,
  hasCapability,
  isPastorOnlyUser,
} from "./permission-utils";
import { buildAuthUser } from "./testing/auth-user-fixture";

/** Canonical user: permissions live in authorization.effective. */
function buildUser(permissions: string[]): AuthUser {
  return {
    id: "actor",
    email: "actor@example.com",
    authorization: {
      effective: {
        permissions,
      },
    },
  };
}

describe("extractPermissions", () => {
  it("reads authorization.effective.permissions only (no legacy fallback)", () => {
    expect(extractPermissions(buildUser(["health:read", " USERS:READ "]))).toEqual([
      "health:read",
      "users:read",
    ]);
    const legacy: AuthUser = {
      id: "actor",
      email: "actor@example.com",
      permissions: ["users:update_profile"],
    };
    expect(extractPermissions(legacy)).toEqual([]);
    expect(extractPermissions(null)).toEqual([]);
  });
});

describe("extractCapabilities / hasCapability", () => {
  it("returns the published capability set, normalized", () => {
    const user: AuthUser = {
      id: "actor",
      email: "actor@example.com",
      authorization: { capabilities: [" Catalogs.Edit ", "rbac.manage"] },
    };
    expect([...extractCapabilities(user)]).toEqual(["catalogs.edit", "rbac.manage"]);
    expect(hasCapability(user, "catalogs.edit")).toBe(true);
    expect(hasCapability(user, "audit.read_system")).toBe(false);
  });

  it("treats a missing capabilities array as deny-all", () => {
    expect(extractCapabilities(buildUser(["catalogs:read"])).size).toBe(0);
    expect(hasCapability(null, "catalogs.edit")).toBe(false);
    expect(hasCapability({ id: "a", email: "a@b.c", roles: ["super-admin"] }, "rbac.manage")).toBe(
      false,
    );
  });

  it("unwraps a {status, data} envelope", () => {
    const user = {
      status: "success",
      data: { id: "x", email: "x@y.z", authorization: { capabilities: ["rbac.manage"] } },
    } as unknown as AuthUser;
    expect(hasCapability(user, "rbac.manage")).toBe(true);
  });
});

describe("canAccessAdminPanel (admin_panel.access)", () => {
  it.each(["admin", "assistant-admin", "super-admin", "coordinator", "pastor", "director-lf"])(
    "lets %s in",
    (role) => {
      expect(canAccessAdminPanel(buildAuthUser({ roles: [role] }))).toBe(true);
    },
  );

  it("denies plain users, club-only actors and anonymous", () => {
    expect(canAccessAdminPanel(buildAuthUser({ roles: ["user"] }))).toBe(false);
    expect(canAccessAdminPanel(buildAuthUser({ roles: [], clubRole: "director" }))).toBe(false);
    expect(canAccessAdminPanel(null)).toBe(false);
    expect(canAccessAdminPanel({ id: "a", email: "a@b.c", roles: ["admin"] })).toBe(false);
  });
});

describe("isPastorOnlyUser (admin_panel.pastor_only)", () => {
  it("is true when the only global role is pastor, whatever the club roles", () => {
    expect(isPastorOnlyUser(buildAuthUser({ roles: ["pastor"] }))).toBe(true);
    expect(isPastorOnlyUser(buildAuthUser({ roles: ["pastor"], clubRole: "director" }))).toBe(true);
  });

  it("is false when pastor is combined with another global role, or without pastor", () => {
    expect(isPastorOnlyUser(buildAuthUser({ roles: ["pastor", "director-lf"] }))).toBe(false);
    expect(isPastorOnlyUser(buildAuthUser({ roles: ["pastor", "super-admin"] }))).toBe(false);
    expect(isPastorOnlyUser(buildAuthUser({ roles: ["director-lf"] }))).toBe(false);
    expect(isPastorOnlyUser(buildAuthUser({ roles: [] }))).toBe(false);
    expect(isPastorOnlyUser(null)).toBe(false);
  });
});

describe("sensitive user families", () => {
  it("grants sensitive family read access with fine permissions", () => {
    const user = buildUser(["health:read", "emergency_contacts:read"]);

    expect(canReadSensitiveUserFamily(user, "health")).toBe(true);
    expect(canReadSensitiveUserFamily(user, "emergency_contacts")).toBe(true);
    expect(canReadSensitiveUserFamily(user, "guardianship")).toBe(false);
  });

  it("keeps the transitional users:read_detail fallback for sensitive family reads", () => {
    const user = buildUser(["users:read_detail"]);

    expect(canReadSensitiveUserFamily(user, "health")).toBe(true);
    expect(canReadSensitiveUserFamily(user, "post_registration")).toBe(true);
  });

  it("grants sensitive family updates with fine permission or users:update_profile", () => {
    expect(
      canUpdateSensitiveUserFamily(buildUser(["guardianship:update"]), "guardianship"),
    ).toBe(true);
    expect(canUpdateSensitiveUserFamily(buildUser(["users:update_profile"]), "health")).toBe(true);
  });

  it("separates post-registration administrative completion from sensitive reads", () => {
    const user = buildUser(["registration:complete"]);

    expect(canReadSensitiveUserFamily(user, "post_registration")).toBe(false);
    expect(canViewAdministrativeCompletion(user)).toBe(true);
    expect(canManageAdministrativeCompletion(user)).toBe(true);
  });
});

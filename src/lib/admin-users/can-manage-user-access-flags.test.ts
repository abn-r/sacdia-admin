import { describe, expect, it } from "vitest";

import type { AuthUser } from "@/lib/auth/types";

import { canManageUserAccessFlags } from "./can-manage-user-access-flags";

function buildUser(roles: string[], permissions: string[]): AuthUser {
  return {
    id: "actor",
    email: "actor@example.com",
    roles,
    authorization: {
      grants: { global_roles: roles.map((role_name) => ({ role_name })) },
      effective: { permissions },
    },
  };
}

const UPDATE_ADMIN = ["users:update_admin"];

describe("canManageUserAccessFlags", () => {
  it("lets admin with users:update_admin see Accesos", () => {
    expect(canManageUserAccessFlags(buildUser(["admin"], UPDATE_ADMIN))).toBe(
      true,
    );
  });

  it("lets super-admin see Accesos (catalog bypass)", () => {
    expect(canManageUserAccessFlags(buildUser(["super-admin"], []))).toBe(true);
  });

  it("lets assistant-admin through the admin GlobalRoles alias", () => {
    expect(
      canManageUserAccessFlags(buildUser(["assistant-admin"], UPDATE_ADMIN)),
    ).toBe(true);
  });

  it("hides Accesos from local-field directors even with users:update_admin", () => {
    expect(
      canManageUserAccessFlags(buildUser(["director-lf"], UPDATE_ADMIN)),
    ).toBe(false);
    expect(
      canManageUserAccessFlags(buildUser(["assistant-lf"], UPDATE_ADMIN)),
    ).toBe(false);
  });

  it("hides Accesos from union, division, and club directors", () => {
    expect(
      canManageUserAccessFlags(buildUser(["director-union"], UPDATE_ADMIN)),
    ).toBe(false);
    expect(
      canManageUserAccessFlags(buildUser(["assistant-union"], UPDATE_ADMIN)),
    ).toBe(false);
    expect(
      canManageUserAccessFlags(buildUser(["director-dia"], UPDATE_ADMIN)),
    ).toBe(false);
    expect(
      canManageUserAccessFlags(buildUser(["director"], UPDATE_ADMIN)),
    ).toBe(false);
  });

  it("hides Accesos from admin without users:update_admin", () => {
    expect(canManageUserAccessFlags(buildUser(["admin"], []))).toBe(false);
  });

  it("denies missing actor", () => {
    expect(canManageUserAccessFlags(null)).toBe(false);
    expect(canManageUserAccessFlags(undefined)).toBe(false);
  });
});

import { beforeAll, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "./types";

let permissionUtils: typeof import("./permission-utils");

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_RBAC_LEGACY_FALLBACK", "true");
  vi.resetModules();
  permissionUtils = await import("./permission-utils");
});

/** Canonical user: permissions live in authorization.effective (new RBAC model). */
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

/**
 * Legacy user: permissions live in the top-level `permissions` array,
 * with no authorization.effective block — forces the legacy fallback path.
 */
function buildLegacyUser(permissions: string[]): AuthUser {
  return {
    id: "actor",
    email: "actor@example.com",
    permissions,
  };
}

describe("permission-utils", () => {
  it("grants sensitive family read access with fine permissions", () => {
    const user = buildUser(["health:read", "emergency_contacts:read"]);

    expect(permissionUtils.canReadSensitiveUserFamily(user, "health")).toBe(true);
    expect(
      permissionUtils.canReadSensitiveUserFamily(user, "emergency_contacts"),
    ).toBe(true);
    expect(
      permissionUtils.canReadSensitiveUserFamily(user, "legal_representative"),
    ).toBe(false);
  });

  it("keeps legacy users:read_detail fallback for sensitive family reads", () => {
    const user = buildUser(["users:read_detail"]);

    expect(permissionUtils.canReadSensitiveUserFamily(user, "health")).toBe(true);
    expect(
      permissionUtils.canReadSensitiveUserFamily(user, "post_registration"),
    ).toBe(true);
  });

  it("grants sensitive family updates with fine permission or legacy fallback", () => {
    const fineGrainedUser = buildUser(["legal_representative:update"]);
    const legacyUser = buildLegacyUser(["users:update_profile"]);

    expect(
      permissionUtils.canUpdateSensitiveUserFamily(
        fineGrainedUser,
        "legal_representative",
      ),
    ).toBe(true);
    expect(
      permissionUtils.canUpdateSensitiveUserFamily(legacyUser, "health"),
    ).toBe(true);
  });

  it("separates post-registration administrative completion from sensitive reads", () => {
    const user = buildLegacyUser(["registration:complete"]);

    expect(
      permissionUtils.canReadSensitiveUserFamily(user, "post_registration"),
    ).toBe(false);
    expect(permissionUtils.canViewAdministrativeCompletion(user)).toBe(true);
    expect(permissionUtils.canManageAdministrativeCompletion(user)).toBe(true);
  });

  it("gates club create on clubs:create, not local-field roles", () => {
    const creator = buildUser(["clubs:create"]);
    const assistantAdmin = {
      id: "actor",
      email: "actor@example.com",
      roles: ["assistant-admin"],
      authorization: {
        grants: { global_roles: [{ role_name: "assistant-admin" }] },
        effective: { permissions: ["clubs:create"] },
      },
    } satisfies AuthUser;
    const directorLf = {
      id: "actor",
      email: "actor@example.com",
      roles: ["director-lf"],
      authorization: {
        grants: { global_roles: [{ role_name: "director-lf" }] },
        effective: { permissions: ["clubs:read"] },
      },
    } satisfies AuthUser;

    expect(permissionUtils.canCreateClubs(creator)).toBe(true);
    expect(permissionUtils.canCreateClubs(assistantAdmin)).toBe(true);
    expect(permissionUtils.canCreateClubs(directorLf)).toBe(false);
  });
});

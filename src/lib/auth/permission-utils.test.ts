import assert from "node:assert/strict";
import { before } from "node:test";
import test from "node:test";
import type { AuthUser } from "./types";

process.env.NEXT_PUBLIC_RBAC_LEGACY_FALLBACK = "true";

let permissionUtils: typeof import("./permission-utils");

before(async () => {
  permissionUtils = await import("./permission-utils");
});

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

test("grants sensitive family read access with fine permissions", () => {
  const user = buildUser(["health:read", "emergency_contacts:read"]);

  assert.equal(permissionUtils.canReadSensitiveUserFamily(user, "health"), true);
  assert.equal(
    permissionUtils.canReadSensitiveUserFamily(user, "emergency_contacts"),
    true,
  );
  assert.equal(
    permissionUtils.canReadSensitiveUserFamily(user, "legal_representative"),
    false,
  );
});

test("keeps legacy users:read_detail fallback for sensitive family reads", () => {
  const user = buildUser(["users:read_detail"]);

  assert.equal(permissionUtils.canReadSensitiveUserFamily(user, "health"), true);
  assert.equal(
    permissionUtils.canReadSensitiveUserFamily(user, "post_registration"),
    true,
  );
});

test("grants sensitive family updates with fine permission or legacy fallback", () => {
  const fineGrainedUser = buildUser(["legal_representative:update"]);
  const legacyUser = buildUser(["users:update"]);

  assert.equal(
    permissionUtils.canUpdateSensitiveUserFamily(
      fineGrainedUser,
      "legal_representative",
    ),
    true,
  );
  assert.equal(
    permissionUtils.canUpdateSensitiveUserFamily(legacyUser, "health"),
    true,
  );
});

test("separates post-registration administrative completion from sensitive reads", () => {
  const user = buildUser(["users:update"]);

  assert.equal(
    permissionUtils.canReadSensitiveUserFamily(user, "post_registration"),
    false,
  );
  assert.equal(permissionUtils.canViewAdministrativeCompletion(user), true);
  assert.equal(permissionUtils.canManageAdministrativeCompletion(user), true);
});

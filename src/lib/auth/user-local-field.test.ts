import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/types";
import {
  canPickLocalField,
  pickLocalFieldIdInScope,
  resolveUserLocalField,
} from "./user-local-field";

function userWithRoles(
  roleName: string,
  global: Record<string, unknown>,
  legacyClubLocalFieldId?: number,
): AuthUser {
  return {
    id: "user-id",
    email: "director@example.com",
    authorization: {
      grants: {
        global_roles: [{ role_name: roleName, permissions: [] }],
      },
      effective: {
        scope: {
          global,
        },
      },
      ...(legacyClubLocalFieldId === undefined
        ? {}
        : { legacy: { club: { local_field_id: legacyClubLocalFieldId } } }),
    },
  };
}

describe("resolveUserLocalField", () => {
  it("keeps a union director at union even when local_field is in the payload", () => {
    expect(
      resolveUserLocalField(
        userWithRoles("director-union", {
          union: { id: 2, name: "Unión Norte" },
          local_field: { id: 9, name: "Campo Casa" },
        }),
      ),
    ).toEqual({ scope: "union", unionId: 2 });
  });

  it("binds director-lf to a single local field", () => {
    expect(
      resolveUserLocalField(
        userWithRoles("director-lf", {
          union: { id: 2 },
          local_field: { id: 9 },
        }),
      ),
    ).toEqual({ scope: "single", localFieldId: 9 });
  });

  it("keeps director-dia at division despite a home local_field", () => {
    expect(
      resolveUserLocalField(
        userWithRoles("director-dia", {
          division: { id: 4 },
          union: { id: 2 },
          local_field: { id: 9 },
        }),
      ),
    ).toEqual({ scope: "division", divisionId: 4 });
  });

  it("lets super-admin stay unscoped despite a home local_field", () => {
    expect(
      resolveUserLocalField(
        userWithRoles("super-admin", {
          local_field: { id: 9 },
        }),
      ),
    ).toEqual({ scope: "all" });
  });

  it("does not collapse an unconfigured union director to the club home field", () => {
    expect(
      resolveUserLocalField(
        userWithRoles("director-union", { local_field: { id: 9 } }, 9),
      ),
    ).toEqual({ scope: "all" });
  });

  it("binds a club-only actor via legacy club local_field", () => {
    expect(resolveUserLocalField(userWithRoles("director", {}, 11))).toEqual({
      scope: "single",
      localFieldId: 11,
    });
  });
});

describe("canPickLocalField / pickLocalFieldIdInScope", () => {
  it("locks single-scope actors to their field", () => {
    const scope = { scope: "single" as const, localFieldId: 9 };
    expect(canPickLocalField(scope)).toBe(false);
    expect(pickLocalFieldIdInScope(scope, 3, new Set([3, 9]))).toBe(9);
  });

  it("lets union actors reduce to a child field and drops out-of-scope ids", () => {
    const scope = { scope: "union" as const, unionId: 2 };
    expect(canPickLocalField(scope)).toBe(true);
    expect(pickLocalFieldIdInScope(scope, 9, new Set([8, 9]))).toBe(9);
    expect(pickLocalFieldIdInScope(scope, 77, new Set([8, 9]))).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/types";
import { resolveAdminTerritoryScope } from "./territory-scope";

function userWithRoles(
  roleName: string,
  global: Record<string, unknown>,
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
    },
  };
}

describe("resolveAdminTerritoryScope", () => {
  it("keeps a union director at union even when local_field is in the payload", () => {
    const scope = resolveAdminTerritoryScope(
      userWithRoles("director-union", {
        union: { id: 2, name: "Unión Norte" },
        local_field: { id: 9, name: "Campo Casa" },
      }),
    );

    expect(scope).toMatchObject({
      level: "union",
      unionId: 2,
      unionName: "Unión Norte",
    });
  });

  it("resolves director-lf by role before reading local_field id", () => {
    expect(
      resolveAdminTerritoryScope(
        userWithRoles("director-lf", {
          union: { id: 2, name: "Unión Norte" },
          local_field: { id: 9, name: "Campo Casa" },
        }),
      ),
    ).toMatchObject({
      level: "local_field",
      localFieldId: 9,
    });
  });

  it("lets super-admin stay global despite a home local_field", () => {
    expect(
      resolveAdminTerritoryScope(
        userWithRoles("super-admin", {
          local_field: { id: 9, name: "Campo Casa" },
        }),
      ),
    ).toEqual({ level: "all" });
  });
});

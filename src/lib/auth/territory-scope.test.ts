import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/types";
import {
  filterUnionsByTerritory,
  isTerritoryUnconfigured,
  resolveAdminTerritoryScope,
  unionOptionFromTerritory,
} from "./territory-scope";

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

  it("keeps a union director's union when listing unions for territory", () => {
    const scope = resolveAdminTerritoryScope(
      userWithRoles("director-union", {
        country: { id: 1 },
        union: { id: 2, name: "Unión Norte" },
        local_field: { id: 9, name: "Campo Casa" },
      }),
    );

    expect(
      filterUnionsByTerritory(
        [
          { union_id: 2, name: "Unión Norte", country_id: 1 },
          { union_id: 8, name: "Otra unión", country_id: 1 },
        ],
        scope,
      ).map((union) => union.union_id),
    ).toEqual([2]);

    expect(unionOptionFromTerritory(scope)).toMatchObject({
      union_id: 2,
      name: "Unión Norte",
    });
  });
});

describe("isTerritoryUnconfigured", () => {
  // Mirrors the backend resolveActorTerritoryScope: a territorial or admin
  // role without its anchor is "unconfigured" and must be blocked.
  it.each([
    ["admin", {}],
    ["assistant-admin", {}],
    ["director-dia", {}],
    ["director-union", {}],
    ["director-lf", { union: { id: 20 } }],
  ])("blocks %s without its territory", (role, global) => {
    expect(isTerritoryUnconfigured(userWithRoles(role, global))).toBe(true);
  });

  it.each([
    ["admin", { union: { id: 20 } }],
    ["admin", { local_field: { id: 4 } }],
    ["admin", { division: { id: 1 } }],
    ["director-dia", { division: { id: 1 } }],
    ["director-union", { union: { id: 20 } }],
    ["director-lf", { local_field: { id: 4 } }],
  ])("lets %s with its anchor through", (role, global) => {
    expect(isTerritoryUnconfigured(userWithRoles(role, global))).toBe(false);
  });

  it.each(["super-admin", "coordinator", "pastor"])(
    "does not apply to %s",
    (role) => {
      expect(isTerritoryUnconfigured(userWithRoles(role, {}))).toBe(false);
    },
  );
});

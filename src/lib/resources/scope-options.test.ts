import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/types";
import {
  isResourceScopeAllowed,
  resolveResourceScopeOptions,
} from "./scope-options";

function userWithRoles(
  roleName: string,
  global: Record<string, unknown>,
): AuthUser {
  return {
    id: "user-1",
    email: "admin@sacdia.test",
    authorization: {
      grants: {
        global_roles: [{ role_name: roleName, permissions: [] }],
      },
      effective: {
        permissions: ["resources:create"],
        scope: {
          global,
          club: null,
        },
      },
    },
  };
}

function userWithGlobalScope(global: Record<string, unknown>): AuthUser {
  return {
    id: "user-1",
    email: "admin@sacdia.test",
    authorization: {
      effective: {
        permissions: ["resources:create"],
        scope: {
          global,
          club: null,
        },
      },
    },
  };
}

describe("resolveResourceScopeOptions", () => {
  it("allows all resource scopes for unscoped global admins", () => {
    expect(resolveResourceScopeOptions(userWithGlobalScope({}))).toEqual({
      allowedScopeLevels: ["system", "division", "union", "local_field"],
      lockedScopeId: null,
    });
  });

  it("does not treat country as a global unlock for territorial roles", () => {
    expect(
      resolveResourceScopeOptions(
        userWithRoles("director-lf", {
          country: { id: 1, name: "México" },
          union: { id: 2, name: "Unión Norte" },
          local_field: { id: 12, name: "Campo 12" },
        }),
      ),
    ).toEqual({
      allowedScopeLevels: ["local_field"],
      lockedScopeId: 12,
    });
  });

  it("keeps a union director at union even with country and home field", () => {
    expect(
      resolveResourceScopeOptions(
        userWithRoles("director-union", {
          country: { id: 1, name: "México" },
          union: { id: 7, name: "Unión 7" },
          local_field: { id: 12, name: "Campo casa" },
        }),
      ),
    ).toEqual({
      allowedScopeLevels: ["union"],
      lockedScopeId: 7,
    });
  });

  it("locks division-scoped admins to their division", () => {
    expect(
      resolveResourceScopeOptions(
        userWithRoles("director-dia", {
          country: { id: 1 },
          division: { id: 5, name: "Division 5" },
        }),
      ),
    ).toEqual({
      allowedScopeLevels: ["division"],
      lockedScopeId: 5,
    });
  });

  it("lets super-admin stay global despite a home local_field", () => {
    expect(
      resolveResourceScopeOptions(
        userWithRoles("super-admin", {
          country: { id: 1 },
          local_field: { id: 12 },
        }),
      ),
    ).toEqual({
      allowedScopeLevels: ["system", "division", "union", "local_field"],
      lockedScopeId: null,
    });
  });
});

describe("isResourceScopeAllowed", () => {
  it("rejects a local-field actor targeting another field or a union", () => {
    const options = {
      allowedScopeLevels: ["local_field"] as const,
      lockedScopeId: 12,
    };

    expect(isResourceScopeAllowed(options, "local_field", 12)).toBe(true);
    expect(isResourceScopeAllowed(options, "local_field", 99)).toBe(false);
    expect(isResourceScopeAllowed(options, "union", 7)).toBe(false);
    expect(isResourceScopeAllowed(options, "system", null)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/types";
import { resolveResourceScopeOptions } from "./scope-options";

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
      allowedScopeLevels: ["system", "union", "local_field"],
      lockedScopeId: null,
    });
  });

  it("allows all resource scopes for country-scoped admins", () => {
    expect(
      resolveResourceScopeOptions(
        userWithGlobalScope({ country: { id: 1, name: "México" } }),
      ),
    ).toEqual({
      allowedScopeLevels: ["system", "union", "local_field"],
      lockedScopeId: null,
    });
  });

  it("locks union-scoped admins to their union", () => {
    expect(
      resolveResourceScopeOptions(
        userWithGlobalScope({ union: { id: 7, name: "Unión 7" } }),
      ),
    ).toEqual({
      allowedScopeLevels: ["union"],
      lockedScopeId: 7,
    });
  });

  it("locks local-field-scoped admins to their local field", () => {
    expect(
      resolveResourceScopeOptions(
        userWithGlobalScope({ local_field: { id: 12, name: "Campo 12" } }),
      ),
    ).toEqual({
      allowedScopeLevels: ["local_field"],
      lockedScopeId: 12,
    });
  });
});

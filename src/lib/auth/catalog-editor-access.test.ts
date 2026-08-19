import { describe, expect, it } from "vitest";

import {
  canAccessCatalogEditor,
  isCatalogEditorPath,
} from "./catalog-editor-access";
import type { AuthUser } from "./types";

function buildUser(roles: string[], permissions: string[] = []): AuthUser {
  return {
    id: "actor",
    email: "actor@example.com",
    roles,
    authorization: {
      grants: {
        global_roles: roles.map((role_name) => ({ role_name })),
      },
      effective: {
        permissions,
      },
    },
  };
}

describe("canAccessCatalogEditor", () => {
  it("allows admin and assistant-admin", () => {
    expect(canAccessCatalogEditor(buildUser(["admin"], ["catalogs:read"]))).toBe(
      true,
    );
    expect(
      canAccessCatalogEditor(buildUser(["assistant-admin"], ["catalogs:read"])),
    ).toBe(true);
  });

  it("allows super-admin even without catalogs:read", () => {
    expect(canAccessCatalogEditor(buildUser(["super-admin"]))).toBe(true);
  });

  it("denies director-lf even with catalogs:read", () => {
    expect(
      canAccessCatalogEditor(buildUser(["director-lf"], ["catalogs:read"])),
    ).toBe(false);
  });
});

describe("isCatalogEditorPath", () => {
  it("treats finance-categories as a catalog editor", () => {
    expect(
      isCatalogEditorPath("/dashboard/catalogs/finance-categories"),
    ).toBe(true);
  });

  it("exempts certifications catalog (no GlobalRoles admin on backend)", () => {
    expect(isCatalogEditorPath("/dashboard/catalogs/certifications")).toBe(
      false,
    );
    expect(
      isCatalogEditorPath("/dashboard/catalogs/certifications/12"),
    ).toBe(false);
  });

  it("fails closed when the pathname is missing", () => {
    expect(isCatalogEditorPath("")).toBe(true);
  });
});

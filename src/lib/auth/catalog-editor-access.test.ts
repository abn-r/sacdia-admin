import { describe, expect, it } from "vitest";

import {
  canAccessCatalogEditor,
  isCatalogEditorPath,
} from "./catalog-editor-access";
import { buildUser } from "@/lib/auth/testing/auth-user-fixture";


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

  it("exempts the catalogs index (gated per link, any-of)", () => {
    expect(isCatalogEditorPath("/dashboard/catalogs")).toBe(false);
    expect(isCatalogEditorPath("/dashboard/catalogs/")).toBe(false);
  });

  it("fails closed when the pathname is missing", () => {
    expect(isCatalogEditorPath("")).toBe(true);
  });
});

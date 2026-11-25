import { describe, expect, it } from "vitest";
import {
  buildRolesHref,
  legacyMatrixHref,
  legacyPermissionsHref,
  legacyUserPermissionsHref,
  resolveRolesTab,
} from "./roles-view";

describe("resolveRolesTab", () => {
  it("returns the requested tab when the viewer can see it", () => {
    expect(resolveRolesTab("by-role", ["roles", "by-role"])).toBe("by-role");
  });

  it("falls back to the first visible tab for an unknown or hidden tab", () => {
    expect(resolveRolesTab("catalog", ["roles", "by-role"])).toBe("roles");
    expect(resolveRolesTab("nope", ["by-role", "catalog"])).toBe("by-role");
    expect(resolveRolesTab(undefined, ["catalog"])).toBe("catalog");
  });

  it("returns null when no tab is visible (access denied)", () => {
    expect(resolveRolesTab("roles", [])).toBeNull();
  });
});

describe("buildRolesHref", () => {
  it("omits ?tab= for the default tab", () => {
    expect(buildRolesHref("roles")).toBe("/dashboard/configuration/roles");
    expect(buildRolesHref("catalog", {}, "catalog")).toBe("/dashboard/configuration/roles");
  });

  it("writes the tab and the selected role", () => {
    expect(buildRolesHref("by-role", { role: "r1" })).toBe(
      "/dashboard/configuration/roles?tab=by-role&role=r1",
    );
  });

  it("keeps catalog pagination only on the catalog tab", () => {
    expect(buildRolesHref("catalog", { page: 3, limit: 50 })).toBe(
      "/dashboard/configuration/roles?tab=catalog&page=3&limit=50",
    );
    expect(buildRolesHref("catalog", { page: 1, limit: 20 })).toBe(
      "/dashboard/configuration/roles?tab=catalog",
    );
    expect(buildRolesHref("roles", { page: 3 })).toBe("/dashboard/configuration/roles");
  });
});

describe("legacy redirects", () => {
  it("sends the matrix to the by-role tab keeping the role", () => {
    expect(legacyMatrixHref({})).toBe("/dashboard/configuration/roles?tab=by-role");
    expect(legacyMatrixHref({ role: "r9" })).toBe(
      "/dashboard/configuration/roles?tab=by-role&role=r9",
    );
  });

  it("sends the permissions catalog to its tab keeping pagination", () => {
    expect(legacyPermissionsHref({})).toBe("/dashboard/configuration/roles?tab=catalog");
    expect(legacyPermissionsHref({ page: "2", limit: "50", other: "x" })).toBe(
      "/dashboard/configuration/roles?tab=catalog&page=2&limit=50",
    );
    expect(legacyPermissionsHref({ page: "abc" })).toBe(
      "/dashboard/configuration/roles?tab=catalog",
    );
  });

  it("sends direct user permissions to its tab", () => {
    expect(legacyUserPermissionsHref()).toBe("/dashboard/configuration/roles?tab=direct");
  });
});

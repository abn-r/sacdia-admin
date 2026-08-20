import { describe, expect, it } from "vitest";

import {
  canAccessDashboardPath,
  resolveNavAccessForPath,
} from "./require-page-access";
import type { AuthUser } from "./types";

function buildUser(roles: string[], permissions: string[]): AuthUser {
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

describe("resolveNavAccessForPath", () => {
  it("maps /dashboard exactly to dashboard:read", () => {
    expect(resolveNavAccessForPath("/dashboard")?.permissions).toEqual([
      "dashboard:read",
    ]);
  });

  it("does not treat /dashboard as prefix of nested routes", () => {
    expect(resolveNavAccessForPath("/dashboard/finances")?.permissions).toEqual(
      ["finances:read"],
    );
  });

  it("matches the longest nested catalog path", () => {
    const access = resolveNavAccessForPath(
      "/dashboard/catalogs/finance-categories",
    );
    expect(access?.permissions).toContain("catalogs:read");
    expect(access?.roles).toContain("admin");
  });
});

describe("canAccessDashboardPath", () => {
  it("lets super-admin through without the page permission", () => {
    expect(
      canAccessDashboardPath(buildUser(["super-admin"], []), "/dashboard/users"),
    ).toBe(true);
  });

  it("blocks a coordinator from finances without finances:read", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["coordinator"], ["dashboard:read", "users:read"]),
        "/dashboard/finances",
      ),
    ).toBe(false);
  });

  it("allows a director-lf with finances:read", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["finances:read"]),
        "/dashboard/finances/123",
      ),
    ).toBe(true);
  });

  it("blocks catalog CRUD when catalogs:read is present without admin role", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["catalogs:read", "countries:read"]),
        "/dashboard/catalogs/countries",
      ),
    ).toBe(false);
  });
});

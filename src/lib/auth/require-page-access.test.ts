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

  it("denies an empty pathname", () => {
    expect(
      canAccessDashboardPath(buildUser(["director-lf"], ["dashboard:read"]), ""),
    ).toBe(false);
  });

  it("denies an unmapped dashboard URL", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["dashboard:read"]),
        "/dashboard/unknown-shell",
      ),
    ).toBe(false);
  });

  it("gates materials request deep links with materiales:read", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["dashboard:read"]),
        "/dashboard/materials/request/FOLIO-1",
      ),
    ).toBe(false);
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["materiales:read"]),
        "/dashboard/materials/request/FOLIO-1",
      ),
    ).toBe(true);
  });

  it("requires super-admin for the global audit viewer", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["admin"], ["audit:read", "roles:read"]),
        "/dashboard/configuration/audit",
      ),
    ).toBe(false);
    expect(
      canAccessDashboardPath(
        buildUser(["super-admin"], []),
        "/dashboard/configuration/audit",
      ),
    ).toBe(true);
  });

  it("requires super-admin for direct user-permissions", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["admin"], ["permissions:assign", "permissions:read"]),
        "/dashboard/rbac/user-permissions",
      ),
    ).toBe(false);
    expect(
      canAccessDashboardPath(
        buildUser(["super-admin"], []),
        "/dashboard/rbac/user-permissions",
      ),
    ).toBe(true);
  });

  it("lets director-lf with investiture:read into enrollments via coordinator alias", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["investiture:read"]),
        "/dashboard/enrollments",
      ),
    ).toBe(true);
  });

  it("allows admin with investiture:read into enrollments", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["admin"], ["investiture:read"]),
        "/dashboard/enrollments",
      ),
    ).toBe(true);
  });

  it("does not treat classes:read as enrollments viewAny", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["admin"], ["classes:read"]),
        "/dashboard/enrollments",
      ),
    ).toBe(false);
  });

  it("requires ecclesiastical_years:update plus admin role for year-end", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["admin"], ["ecclesiastical_years:read", "permissions:read"]),
        "/dashboard/year-end",
      ),
    ).toBe(false);
    expect(
      canAccessDashboardPath(
        buildUser(["admin"], ["ecclesiastical_years:update"]),
        "/dashboard/year-end",
      ),
    ).toBe(true);
  });

  it("lets admin open jobs without permissions:read", () => {
    expect(
      canAccessDashboardPath(buildUser(["admin"], []), "/dashboard/system/jobs"),
    ).toBe(true);
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["permissions:read"]),
        "/dashboard/system/jobs",
      ),
    ).toBe(false);
  });

  it("requires certifications:configure for the GM catalog editor", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["catalogs:read", "user_certifications:read"]),
        "/dashboard/catalogs/certifications",
      ),
    ).toBe(false);
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["certifications:configure"]),
        "/dashboard/catalogs/certifications",
      ),
    ).toBe(true);
  });

  it("requires both roles:read and permissions:read for the RBAC matrix", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["admin"], ["roles:read"]),
        "/dashboard/configuration/matrix",
      ),
    ).toBe(false);
    expect(
      canAccessDashboardPath(
        buildUser(["admin"], ["roles:read", "permissions:read"]),
        "/dashboard/configuration/matrix",
      ),
    ).toBe(true);
  });

  it("requires clubs:create for club new and import, not director-lf", () => {
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["clubs:read"]),
        "/dashboard/clubs/new",
      ),
    ).toBe(false);
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["clubs:read"]),
        "/dashboard/clubs/import",
      ),
    ).toBe(false);
    expect(
      canAccessDashboardPath(
        buildUser(["assistant-admin"], ["clubs:create"]),
        "/dashboard/clubs/new",
      ),
    ).toBe(true);
    expect(
      canAccessDashboardPath(
        buildUser(["director-lf"], ["clubs:read"]),
        "/dashboard/clubs",
      ),
    ).toBe(true);
  });
});

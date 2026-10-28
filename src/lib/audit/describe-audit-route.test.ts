import { describe, expect, it } from "vitest";
import { describeAuditRoute, shortAuditId } from "./describe-audit-route";

describe("describeAuditRoute", () => {
  it("labels a role deactivation (DELETE) as a soft delete", () => {
    expect(describeAuditRoute({ summary: "DELETE /api/v1/admin/rbac/roles/[REDACTED]" })).toEqual({
      routeKey: "roleDeactivated",
      entityKind: "role",
      softDelete: true,
    });
  });

  it("labels role creation and update", () => {
    expect(describeAuditRoute({ summary: "POST /api/v1/admin/rbac/roles" })?.routeKey).toBe("roleCreated");
    expect(
      describeAuditRoute({
        summary: "PATCH /api/v1/admin/rbac/roles/3f2a1b4c-0000-4000-8000-000000000000",
      })?.routeKey,
    ).toBe("roleUpdated");
  });

  it("tells the full replace of a role's permissions from adding some", () => {
    expect(
      describeAuditRoute({ summary: "PUT /api/v1/admin/rbac/roles/abc/permissions" })?.routeKey,
    ).toBe("rolePermissionsReplaced");
    expect(
      describeAuditRoute({ summary: "POST /api/v1/admin/rbac/roles/abc/permissions" })?.routeKey,
    ).toBe("rolePermissionsAdded");
  });

  it("keeps a plain removal of a permission from a role as a hard delete", () => {
    expect(
      describeAuditRoute({ summary: "DELETE /api/v1/admin/rbac/roles/abc/permissions/def" }),
    ).toEqual({ routeKey: "rolePermissionRemoved", entityKind: "role", softDelete: false });
  });

  it("maps the user-scoped routes to the id the backend records", () => {
    expect(
      describeAuditRoute({ summary: "POST /api/v1/admin/rbac/users/u1/roles" })?.entityKind,
    ).toBe("user");
    expect(
      describeAuditRoute({ summary: "DELETE /api/v1/admin/rbac/users/u1/roles/r1" })?.entityKind,
    ).toBe("role");
  });

  it("falls back to request_context when the summary is not a route", () => {
    expect(
      describeAuditRoute({
        summary: "Rol actualizado",
        request_context: { method: "delete", path: "/api/v1/admin/rbac/permissions/xyz" },
      })?.routeKey,
    ).toBe("permissionDeactivated");
  });

  it("returns null for unknown routes, other methods and empty input", () => {
    expect(describeAuditRoute({ summary: "POST /api/v1/clubs/1/members" })).toBeNull();
    expect(describeAuditRoute({ summary: "GET /api/v1/admin/rbac/roles" })).toBeNull();
    expect(describeAuditRoute({ summary: null })).toBeNull();
    expect(describeAuditRoute({})).toBeNull();
  });
});

describe("shortAuditId", () => {
  it("truncates long ids and leaves short ones alone", () => {
    expect(shortAuditId("3f2a1b4c-0000-4000-8000-000000000000")).toBe("3f2a1b4c…");
    expect(shortAuditId("-")).toBe("-");
  });
});

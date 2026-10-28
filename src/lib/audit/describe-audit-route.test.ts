import { describe, expect, it } from "vitest";
import { describeAuditRoute, hasAuditEntityId, shortAuditId } from "./describe-audit-route";

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

describe("describeAuditRoute - non-RBAC routes", () => {
  const cases: Array<[string, string, string, string]> = [
    ["POST /api/v1/auth/login", "sessionLogin", "session", "LOGIN"],
    ["POST /api/v1/auth/logout", "sessionLogout", "session", "LOGOUT"],
    ["PATCH /api/v1/auth/me/context", "contextChanged", "session", ""],
    ["POST /api/v1/users/me/legal-acceptance", "legalAccepted", "user", ""],
    ["PATCH /api/v1/annual-folders/templates/[REDACTED]", "folderTemplateUpdated", "folderTemplate", ""],
    ["POST /api/v1/annual-folders/templates/[REDACTED]/sections", "templateSectionAdded", "folderTemplate", ""],
    ["PATCH /api/v1/annual-folders/templates/sections/[REDACTED]", "templateSectionUpdated", "templateSection", ""],
    ["POST /api/v1/annual-folders/[REDACTED]/sections/[REDACTED]/evaluate", "folderSectionEvaluated", "folderSection", ""],
    ["POST /api/v1/annual-folders/[REDACTED]/sections/[REDACTED]/submit", "folderSectionSubmitted", "folderSection", ""],
    ["POST /api/v1/admin/achievements", "achievementCreated", "achievement", ""],
    ["PATCH /api/v1/admin/achievements/categories/4", "achievementCategoryUpdated", "achievementCategory", ""],
    ["POST /api/v1/clubs/12/finances", "financeCreated", "club", ""],
    ["DELETE /api/v1/finances/81", "financeDeleted", "finance", ""],
    ["POST /api/v1/clubs/12/activities", "activityCreated", "club", ""],
    ["PATCH /api/v1/activities/7", "activityUpdated", "activity", ""],
    ["POST /api/v1/club-sections/3/investiture-requests", "investitureRequestCreated", "clubSection", ""],
    ["POST /api/v1/investiture-requests/[REDACTED]/resolutions", "investitureRequestResolved", "investitureRequest", ""],
    ["PATCH /api/v1/users/[REDACTED]/classes/5/progress", "classProgressUpdated", "class", ""],
    ["POST /api/v1/certificate-bulk-imports/[REDACTED]/submit", "certificateBatchSubmitted", "certificateBatch", ""],
    ["POST /api/v1/admin/honor-instructor-proposals/[REDACTED]/approve", "honorProposalApproved", "honorProposal", ""],
    ["POST /api/v1/camporee-orders/[REDACTED]/approve", "camporeeOrderApproved", "camporeeOrder", ""],
    ["PUT /api/v1/camporees/9/supply-plan", "supplyPlanSaved", "camporee", ""],
    ["PUT /api/v1/union-camporees/9/supply-plan", "supplyPlanSaved", "camporee", ""],
    ["POST /api/v1/monthly-reports/[REDACTED]/submit", "monthlyReportSubmitted", "monthlyReport", ""],
  ];

  it.each(cases)("maps %s", (summary, routeKey, entityKind, action) => {
    const info = describeAuditRoute({ summary });
    expect(info?.routeKey).toBe(routeKey);
    expect(info?.entityKind).toBe(entityKind);
    expect(info?.action ?? "").toBe(action);
  });

  it("marks soft deletes only where the backend deactivates the record", () => {
    expect(describeAuditRoute({ summary: "DELETE /api/v1/admin/achievements/3" })).toMatchObject({
      routeKey: "achievementDeactivated",
      softDelete: true,
    });
    expect(describeAuditRoute({ summary: "DELETE /api/v1/activities/3" })?.softDelete).toBe(false);
    expect(
      describeAuditRoute({ summary: "DELETE /api/v1/annual-folders/templates/[REDACTED]" }),
    ).toMatchObject({ routeKey: "folderTemplateDeleted", softDelete: false });
  });

  it("does not confuse template sections with templates or folders", () => {
    expect(
      describeAuditRoute({ summary: "DELETE /api/v1/annual-folders/templates/sections/[REDACTED]" })
        ?.routeKey,
    ).toBe("templateSectionDeleted");
    expect(
      describeAuditRoute({ summary: "POST /api/v1/annual-folders/[REDACTED]/close" })?.routeKey,
    ).toBe("folderClosed");
  });

  it("keeps unknown or mismatched method rows raw", () => {
    expect(describeAuditRoute({ summary: "POST /api/v1/auth/refresh" })).toBeNull();
    expect(describeAuditRoute({ summary: "GET /api/v1/auth/login" })).toBeNull();
    expect(describeAuditRoute({ summary: "POST /api/v1/clubs/12/members" })).toBeNull();
  });
});

describe("hasAuditEntityId", () => {
  it("treats the backend placeholder and blanks as no id", () => {
    expect(hasAuditEntityId("-")).toBe(false);
    expect(hasAuditEntityId("  ")).toBe(false);
    expect(hasAuditEntityId(null)).toBe(false);
    expect(hasAuditEntityId("abc")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  auditFiltersToSearch,
  auditNeedsClientActionFilter,
  auditServerQuery,
  matchesAuditAction,
  matchesAuditSearch,
  parseAuditFilters,
} from "./audit-filters";

describe("parseAuditFilters", () => {
  it("reads valid filters from search params", () => {
    const params = new URLSearchParams(
      "q=Tom%C3%A1s&action=deactivated&result=failed&from=2026-11-01&to=2026-11-24",
    );
    expect(parseAuditFilters(params)).toEqual({
      q: "Tomás",
      action: "deactivated",
      result: "failed",
      from: "2026-11-01",
      to: "2026-11-24",
    });
  });

  it("ignores unknown actions, results and malformed dates", () => {
    expect(
      parseAuditFilters({ action: "explode", result: "meh", from: "01/11/2026", to: "" }),
    ).toEqual({});
  });

  it("round-trips through the query string", () => {
    const filters = parseAuditFilters({ action: "login", from: "2026-11-01" });
    expect(parseAuditFilters(new URLSearchParams(auditFiltersToSearch(filters)))).toEqual(filters);
    expect(auditFiltersToSearch({})).toBe("");
  });
});

describe("auditServerQuery", () => {
  it("narrows on the server as far as the API allows", () => {
    expect(auditServerQuery({ action: "updated", result: "failed", from: "2026-11-01" })).toEqual({
      action: "UPDATED",
      result: "failed",
      from: "2026-11-01",
    });
    expect(auditServerQuery({ action: "login" })).toEqual({ action: "CREATED", entity_type: "auth" });
    expect(auditServerQuery({ action: "deactivated" })).toEqual({ action: "DELETED" });
    expect(auditServerQuery({ action: "denied" })).toEqual({ action: "AUTHORIZATION_DENIED" });
  });

  it("never sends the free-text search", () => {
    expect(auditServerQuery({ q: "club" })).toEqual({});
  });

  it("needs the client for derived actions only", () => {
    expect(auditNeedsClientActionFilter("logout")).toBe(true);
    expect(auditNeedsClientActionFilter("updated")).toBe(false);
    expect(auditNeedsClientActionFilter(undefined)).toBe(false);
  });
});

describe("matchesAuditAction", () => {
  const login = { action: "CREATED", summary: "POST /api/v1/auth/login" };
  const logout = { action: "CREATED", summary: "POST /api/v1/auth/logout" };
  const deactivated = { action: "DELETED", summary: "DELETE /api/v1/admin/rbac/roles/[REDACTED]" };
  const removed = { action: "DELETED", summary: "DELETE /api/v1/annual-folders/templates/[REDACTED]" };
  const created = { action: "CREATED", summary: "POST /api/v1/clubs/12/members" };

  it("tells session events and deactivations apart from plain create/delete", () => {
    expect(matchesAuditAction(login, "login")).toBe(true);
    expect(matchesAuditAction(login, "logout")).toBe(false);
    expect(matchesAuditAction(logout, "logout")).toBe(true);
    expect(matchesAuditAction(login, "created")).toBe(false);
    expect(matchesAuditAction(created, "created")).toBe(true);
    expect(matchesAuditAction(deactivated, "deactivated")).toBe(true);
    expect(matchesAuditAction(deactivated, "deleted")).toBe(false);
    expect(matchesAuditAction(removed, "deleted")).toBe(true);
    expect(matchesAuditAction(removed, "deactivated")).toBe(false);
  });

  it("matches everything without a filter", () => {
    expect(matchesAuditAction(created, undefined)).toBe(true);
  });
});

describe("matchesAuditSearch", () => {
  it("ignores case and accents and checks every field", () => {
    expect(matchesAuditSearch(["Rol actualizado", "Tomás Vega"], "tomas")).toBe(true);
    expect(matchesAuditSearch(["Rol actualizado", null], "club")).toBe(false);
    expect(matchesAuditSearch(["x"], undefined)).toBe(true);
  });
});

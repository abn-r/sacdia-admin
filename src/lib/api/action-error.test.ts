import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  classifyActionError,
  getActionErrorMessage,
  isForbiddenActionError,
  isUnauthenticatedActionError,
  toEndpointState,
} from "@/lib/api/action-error";

describe("getActionErrorMessage", () => {
  it("maps CAMPOREE_EVENT_RESPONSIBLE_REQUIRED from the payload code", () => {
    const error = new ApiError("App Bad Request Exception", 400, {
      code: "CAMPOREE_EVENT_RESPONSIBLE_REQUIRED",
    });

    expect(getActionErrorMessage(error, "fallback")).toContain(
      "responsable del roster de personal",
    );
  });

  it("maps CAMPOREE_EVENT_HONOR_NOT_FOUND", () => {
    const error = new ApiError("App Bad Request Exception", 400, {
      code: "CAMPOREE_EVENT_HONOR_NOT_FOUND",
    });

    expect(getActionErrorMessage(error, "fallback")).toContain(
      "especialidades seleccionadas",
    );
  });

  it("maps MR_CONSENT_NOT_VERIFIED (409) to a guardian consent explanation", () => {
    const error = new ApiError("Conflict", 409, {
      code: "MR_CONSENT_NOT_VERIFIED",
    });

    const message = getActionErrorMessage(error, "fallback");
    expect(message).toContain("consentimiento");
    expect(message).toContain("tutor");
    expect(message).not.toContain("conflicto de datos");
  });

  it("maps a nested MR_CONSENT_NOT_VERIFIED code", () => {
    const error = new ApiError("Conflict", 409, {
      error: { code: "MR_CONSENT_NOT_VERIFIED" },
    });

    expect(getActionErrorMessage(error, "fallback")).toContain("consentimiento");
  });

  it("keeps generic conflict copy for other 409 codes", () => {
    const error = new ApiError("Conflict", 409, { code: "SOMETHING_ELSE" });

    expect(getActionErrorMessage(error, "fallback")).toContain("conflicto de datos");
  });

  it("keeps permission copy for 403", () => {
    const error = new ApiError("Forbidden", 403, null);

    expect(getActionErrorMessage(error, "fallback")).toBe(
      "No tienes permisos para realizar esta acción.",
    );
  });
});

describe("getActionErrorMessage director plan codes", () => {
  it("maps CLUB_DIRECTOR_PLAN_WINDOW_CLOSED (403) to the window message, not the generic 403", () => {
    const error = new ApiError("Forbidden", 403, {
      code: "CLUB_DIRECTOR_PLAN_WINDOW_CLOSED",
    });

    const message = getActionErrorMessage(error, "fallback");
    expect(message).toContain("1 de octubre");
    expect(message).toContain("31 de diciembre");
  });
});

describe("classifyActionError", () => {
  it("separates 401 (unauthenticated) from 403 (forbidden)", () => {
    expect(classifyActionError(new ApiError("Unauthorized", 401, {})).kind).toBe("unauthenticated");
    const forbidden = classifyActionError(new ApiError("Forbidden", 403, {}));
    expect(forbidden.kind).toBe("forbidden");
    expect(forbidden.forbiddenReason).toBe("status");
    expect(isUnauthenticatedActionError(new ApiError("x", 401, {}))).toBe(true);
    expect(isForbiddenActionError(new ApiError("x", 401, {}))).toBe(false);
  });

  it.each([
    ["GUARD_PERMISSION_DENIED", "permission"],
    ["GUARD_CLUB_SCOPE_REQUIRED", "club_scope"],
    ["ADMIN_USER_SCOPE_MISSING", "scope_missing"],
    ["CLUB_ROLE_MUTATION_FORBIDDEN", "domain"],
    ["CAMPOREE_ORDER_FORBIDDEN", "domain"],
  ])("recognises %s as forbidden (%s)", (code, reason) => {
    const error = new ApiError("Forbidden", 403, { code });
    const result = classifyActionError(error);
    expect(result.kind).toBe("forbidden");
    expect(result.forbiddenReason).toBe(reason);
    expect(result.code).toBe(code);
  });

  it("reads nested error codes and classifies by code before status", () => {
    const nested = new ApiError("Bad request", 400, { error: { code: "GUARD_PERMISSION_DENIED" } });
    expect(classifyActionError(nested)).toMatchObject({
      kind: "forbidden",
      forbiddenReason: "permission",
      code: "GUARD_PERMISSION_DENIED",
    });
  });

  it.each([
    [404, "not_found"],
    [405, "not_found"],
    [409, "conflict"],
    [400, "validation"],
    [422, "validation"],
    [429, "rate_limited"],
    [500, "unavailable"],
    [503, "unavailable"],
    [418, "other"],
  ])("maps status %s to %s", (status, kind) => {
    expect(classifyActionError(new ApiError("x", status, {})).kind).toBe(kind);
  });

  it("classifies non-API errors as other", () => {
    expect(classifyActionError(new Error("boom"))).toEqual({
      kind: "other",
      status: null,
      code: undefined,
      forbiddenReason: null,
    });
  });
});

describe("toEndpointState", () => {
  it("renders 401 and 403 as forbidden, 429 as rate-limited, the rest as missing", () => {
    expect(toEndpointState(new ApiError("x", 401, {}))).toBe("forbidden");
    expect(toEndpointState(new ApiError("x", 403, {}))).toBe("forbidden");
    expect(toEndpointState(new ApiError("x", 200, { code: "GUARD_CLUB_SCOPE_REQUIRED" }))).toBe(
      "forbidden",
    );
    expect(toEndpointState(new ApiError("x", 429, {}))).toBe("rate-limited");
    expect(toEndpointState(new ApiError("x", 500, {}))).toBe("missing");
  });
});

describe("getActionErrorMessage (401 vs 403)", () => {
  it("gives distinct messages for 401 and 403", () => {
    const unauthenticated = getActionErrorMessage(new ApiError("x", 401, {}), "fallback");
    const forbidden = getActionErrorMessage(new ApiError("x", 403, {}), "fallback");
    expect(unauthenticated).not.toBe(forbidden);
    expect(forbidden).toMatch(/permisos/);
    expect(unauthenticated).toMatch(/sesión/i);
  });

  it("prefers the domain message of a *_FORBIDDEN code", () => {
    expect(
      getActionErrorMessage(new ApiError("x", 403, { code: "CLUB_ROLE_MUTATION_FORBIDDEN" }), "f"),
    ).toMatch(/cargos de esta sección/);
  });

  it("falls back to the generic forbidden message for unmapped forbidden codes", () => {
    expect(getActionErrorMessage(new ApiError("x", 403, { code: "SOMETHING_FORBIDDEN" }), "f")).toMatch(
      /permisos/,
    );
  });
});

describe("getActionErrorMessage (camporee staff)", () => {
  it("points the publish error to the assignments editor", () => {
    const error = new ApiError("Bad", 400, { code: "CAMPOREE_EVENT_RESPONSIBLE_REQUIRED" });
    expect(getActionErrorMessage(error, "fallback")).toContain("Personal asignado");
  });

  it("maps the staff roster codes", () => {
    const dup = new ApiError("Conflict", 409, { code: "CAMPOREE_STAFF_DUPLICATE" });
    expect(getActionErrorMessage(dup, "fallback")).toContain("ya está activa");
    const scope = new ApiError("Bad", 400, { code: "CAMPOREE_STAFF_SCOPE_MISMATCH" });
    expect(getActionErrorMessage(scope, "fallback")).toContain("no pertenece");
  });
});

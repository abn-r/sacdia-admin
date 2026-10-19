import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api/client";
import { getActionErrorMessage } from "@/lib/api/action-error";

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
